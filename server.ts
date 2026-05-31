import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();

// ১. কোনো প্যাকেজ ছাড়া ম্যানুয়ালি CORS হেডার সেট করা (সবচেয়ে পাওয়ারফুল ফিক্স)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // ব্রাউজার যখন মেইন রিকোয়েস্টের আগে OPTIONS (Preflight) পাঠাবে, তাকে সরাসরি ২০০ ওকে করে দেবে
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

app.post('/api/scan', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key missing");

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const imgData = req.body.image.split(',')[1];
    const prompt = 'Extract UTR and Amount. Return ONLY JSON like {"utr": "value", "amount": "value"}';

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imgData, mimeType: 'image/jpeg' } }
    ]);

    let text = result.response.text();
    text = text.split('```json').join('').split('```').join('').trim();
    
    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
