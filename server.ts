import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));

app.post('/api/scan', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key missing");
    
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    
    const imgData = req.body.image.split(',')[1];
    const prompt = 'Extract UTR and Amount. Return ONLY JSON like {"utr": "value", "amount": "value"}';
    
    const result = await model.generateContent([prompt, {
      inlineData: {data: imgData, mimeType: 'image/jpeg'}
    }]);
    
    // কোনো রেগুলার এক্সপ্রেশন ছাড়া সহজ রিপ্লেস
    let text = result.response.text();
    text = text.split("```json").join("");
    text = text.split("
```").join("");
    
    res.json({success: true, data: JSON.parse(text.trim())});
  } catch (e: any) {
    res.status(500).json({error: e.message});
  }
});

app.listen(Number(process.env.PORT) || 3000);
