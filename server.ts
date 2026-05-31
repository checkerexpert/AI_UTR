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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(["Extract UTR and Amount. Return JSON only.", { inlineData: { data: image.split(",")[1], mimeType: "image/jpeg" } }]);
    const text = result.response.text().replace("```json", "").replace("```", "");
    res.json(JSON.parse(text));
  } catch (err) {
    res.status(500).json({ error: "Scan Failed" });
  }
});

app.listen(3000, "0.0.0.0");
