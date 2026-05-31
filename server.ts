import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

// 1. Google AI Studio থেকে কি (API Key) নিয়ে এখানে বসাও
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image missing" });

    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    
    // 2. Gemini 1.5 Flash মডেল ব্যবহার করছি (এটি ফাস্ট এবং প্রতিদিন ১৫০০টি ফ্রি)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 3. পারফেক্ট প্রম্পট যা স্লিপের সবকিছু নিখুঁতভাবে বুঝবে
    const prompt = `Analyze this payment receipt.
    Extract the following two fields:
    1. UTR (Transaction ID): Look for a 12 to 20 digit number.
    2. Amount: The final payment amount.
    Return strictly in JSON format: {"utr": "value", "amount": "value"}.
    If not found, return "NOT_FOUND" or "0.00". Do not add any conversational text.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanJson);

    return res.json({ success: true, ...data });

  } catch (error: any) {
    console.error("Gemini Error:", error);
    return res.status(500).json({ success: false, error: "AI Scan Failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Gemini Server running on port ${PORT}`));
