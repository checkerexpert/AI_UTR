import express from 'express';

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

async function tryGeminiScan(modelName: string, key: string, imgData: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imgData } }
          ]
        }]
      })
    }
  );
  return await response.json();
}

app.post('/api/scan', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key missing on server");

    const imgData = req.body.image.split(',')[1];
    if (!imgData) throw new Error("Invalid image data");

    const prompt = 'Extract UTR and Amount from this receipt. Return ONLY a valid JSON object like {"utr": "123456789012", "amount": "500"}. Do not include any markdown or extra text.';
    
    let result = await tryGeminiScan('gemini-2.5-flash', key, imgData, prompt);
    
    if (result.error) {
      result = await tryGeminiScan('gemini-1.5-pro', key, imgData, prompt);
    }

    if (result.error) {
      throw new Error(`Google API Error: ${result.error.message}`);
    }

    if (!result.candidates || !result.candidates[0]) {
      throw new Error("No response from Gemini models");
    }

    let text = result.candidates[0].content.parts[0].text.trim();
    console.log("Raw Gemini Text:", text); // রেন্ডার লগে আসল টেক্সট দেখার জন্য

    // জেমিনির টেক্সট থেকে নিখুঁতভাবে JSON অবজেক্ট খুঁজে বের করার ফুল-প্রুফ লজিক
    const firstBracket = text.indexOf('{');
    const lastBracket = text.lastIndexOf('}');
    
    if (firstBracket !== -1 && lastBracket !== -1) {
      text = text.substring(firstBracket, lastBracket + 1);
    } else {
      throw new Error("Could not find JSON structure in response");
    }

    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
