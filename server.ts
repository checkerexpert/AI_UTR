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

    const prompt = "Extract UTR and Amount from this receipt. Return ONLY JSON like this: {'utr': '123', 'amount': '100.00'}";

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    const cleanText = text.replace(/```/g, "").replace("json", "").trim();
    
    res.json({ success: true, ...JSON.parse(cleanText) });
  } catch (error) {
    res.status(500).json({ success: false, error: "Scan Failed" });
  }
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running`));
