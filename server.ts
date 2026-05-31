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

async function tryGeminiScan(modelName: string, key: string, imgData: string, mimeType: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: imgData } }
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

    const rawImage = req.body.image; // e.g., "data:image/png;base64,iVBORw..."
    if (!rawImage) throw new Error("Invalid image data");

    // ১. ইমেজ থেকে ডাইনামিকালি mimeType বের করার লজিক (png/jpeg/webp)
    let mimeType = "image/jpeg"; 
    if (rawImage.includes("data:")) {
      const mimeMatch = rawImage.match(/data:([^;]+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    }

    // ২. শুধু পিওর বেস৬৪ (Base64) ডেটা আলাদা করা
    const imgData = rawImage.split(',')[1] || rawImage;

    const prompt = 'Read this payment receipt. Extract the UTR/Reference number and the transaction Amount. Return ONLY JSON like {"utr": "value", "amount": "value"}';
    
    // ডাইনামিক mimeType সহ জেমিনিকে কল করা
    let result = await tryGeminiScan('gemini-2.5-flash', key, imgData, mimeType, prompt);
    
    if (result.error) {
      result = await tryGeminiScan('gemini-1.5-pro', key, imgData, mimeType, prompt);
    }

    if (result.error) {
      throw new Error(`Google API Error: ${result.error.message}`);
    }

    if (!result.candidates || !result.candidates[0]) {
      throw new Error("No response from Gemini models");
    }

    let text = result.candidates[0].content.parts[0].text.trim();
    
    // JSON ব্র্যাকেট ফিল্টার
    const firstBracket = text.indexOf('{');
    const lastBracket = text.lastIndexOf('}');
    if (firstBracket !== -1 && lastBracket !== -1) {
      text = text.substring(firstBracket, lastBracket + 1);
    }

    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
