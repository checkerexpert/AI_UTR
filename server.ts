import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image missing" });

    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Analyze this payment receipt. Extract UTR (12-20 digits) and Amount. Return ONLY JSON format: {'utr': 'value', 'amount': 'value'}. If not found, return {'utr': 'NOT_FOUND', 'amount': '0.00'}. No extra text.";

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    // এখানে কোনো রেগুলার এক্সপ্রেশন ব্যবহার করা হয়নি যা ভেঙে যেতে পারে
    const cleanJson = text.split("```")[1] ? text.split("
```")[1].replace("json", "") : text;
    
    res.json({ success: true, ...JSON.parse(cleanJson.trim()) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "AI Scan Failed" });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
