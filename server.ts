import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();

// CORS ম্যানুয়াল হেডার (যা পারফেক্টলি কাজ করছে)
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

app.post('/api/scan', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key missing");

    // নতুন অফিশিয়াল গুগল জেন-এআই ক্লায়েন্ট ইনিশিয়েট করা
    const ai = new GoogleGenAI({ apiKey: key });

    const imgData = req.body.image.split(',')[1];
    const prompt = 'Extract UTR and Amount. Return ONLY JSON like {"utr": "value", "amount": "value"}';

    // নতুন মেথড: ai.models.generateContent
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        prompt,
        {
          inlineData: {
            data: imgData,
            mimeType: 'image/jpeg'
          }
        }
      ]
    });

    let text = response.text;
    if (!text) throw new Error("No text returned from Gemini");
    
    text = text.split('```json').join('').split('```').join('').trim();
    
    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
