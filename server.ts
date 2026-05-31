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
    // এখানে মডেলের নামের সাথে 'models/' যোগ করা হয়েছে যা এরর ফিক্স করবে
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });
    
    const imgData = req.body.image.split(',')[1];
    const prompt = 'Extract UTR and Amount. Return ONLY JSON like {"utr": "value", "amount": "value"}';
    
    const result = await model.generateContent([prompt, {
      inlineData: {data: imgData, mimeType: 'image/jpeg'}
    }]);
    
    const text = result.response.text().replace(/```json|
```/g, '').trim();
    res.json({success: true, data: JSON.parse(text)});
  } catch (e: any) {
    res.status(500).json({error: e.message});
  }
});

app.listen(Number(process.env.PORT) || 3000);
