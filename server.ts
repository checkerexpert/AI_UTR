import express from 'express';

const app = express();

// CORS ম্যানুয়াল হেডার (যা অলরেডি সাকসেসফুলি কানেক্ট হচ্ছে)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Origin", "*");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

// গুগলে হিট করার জন্য একটি জেনেনিক ফাংশন
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

    const prompt = 'Extract UTR and Amount. Return ONLY JSON like {"utr": "value", "amount": "value"}';
    
    // ১. প্রথমে লেটেস্ট gemini-2.5-flash ট্রাই করবে
    let result = await tryGeminiScan('gemini-2.5-flash', key, imgData, prompt);
    
    // ২. যদি ২৪০৪ বা অন্য এরর দেয়, তবে ব্যাকআপ মডেল gemini-1.5-pro ট্রাই করবে
    if (result.error) {
      console.log("Switching to backup model due to error:", result.error.message);
      result = await tryGeminiScan('gemini-1.5-pro', key, imgData, prompt);
    }

    if (result.error) {
      throw new Error(`Google API Error: ${result.error.message}`);
    }

    if (!result.candidates || !result.candidates[0]) {
      throw new Error("No response from Gemini models");
    }

    let text = result.candidates[0].content.parts[0].text;
    text = text.split('```json').join('').split('```').join('').trim();

    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
