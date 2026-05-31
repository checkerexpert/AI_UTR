import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json({limit: '50mb'}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.post('/api/scan', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({model: 'gemini-1.5-flash'});
    const imgData = req.body.image.split(',')[1];
    const prompt = 'Extract UTR and Amount as JSON {"utr": "...", "amount": "..."}';
    
    const result = await model.generateContent([prompt, {
      inlineData: {data: imgData, mimeType: 'image/jpeg'}
    }]);
    
    const text = result.response.text().replace(/```json|```/g, '').trim();
    res.json({success: true, data: JSON.parse(text)});
  } catch (e) {
    res.status(500).json({error: 'Scan Failed'});
  }
});

app.listen(Number(process.env.PORT) || 3000);
