import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

// রেন্ডারের এনভায়রনমেন্ট থেকে কি-টি নিচ্ছে
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image missing" });

    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    
    // Gemini 1.5 Flash মডেল ব্যবহার
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Analyze this payment receipt.
    Extract the UTR (Transaction ID - 12 to 20 digits) and the Amount (final paid amount).
    Return strictly in JSON format: {"utr": "value", "amount": "value"}.
    If not found, return "NOT_FOUND" or "0.00". Do not add any extra text.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, "").replace(/
```/g, "").trim();
    
    res.json({ success: true, ...JSON.parse(cleanJson) });

  } catch (error: any) {
    console.error("Gemini Error:", error);
    res.status(500).json({ success: false, error: "AI Scan Failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
