import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.get('/debug-models', async (req, res) => {
  try {
    const models = await genAI.listModels();
    res.json(models);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
