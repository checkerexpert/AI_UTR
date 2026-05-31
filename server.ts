import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json({limit: "50mb"}));

app.post("/api/scan", async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key missing");
    const genAI = new GoogleGenerativeAI(key);
    
    // এই নামটাই সবচেয়ে বেশি কাজ করে, কোনো এক্সট্রা কিছু ছাড়া
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const imgData = req.body.image.split(",")[1];
    const prompt = "Extract UTR and Amount. Return JSON in this format: {\"utr\": \"value\", \"amount\": \"value\"}";
    
    const result = await model.generateContent([prompt, { inlineData: { data: imgData, mimeType: "image/jpeg" } }]);
    let text = result.response.text();
    text = text.split("```json").join("").split("```").join("").trim();
    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
