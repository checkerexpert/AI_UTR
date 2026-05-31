import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

// তোমার API Key এখানে বসাও
const genAI = new GoogleGenerativeAI("YOUR_GEMINI_API_KEY");

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `এই পেমেন্ট স্লিপটি থেকে UTR নম্বর এবং অ্যামাউন্ট বের করো। 
    শুধুমাত্র JSON ফরম্যাটে উত্তর দাও: {"utr": "UTR_NUMBER", "amount": "AMOUNT"}.
    যদি কোনোটি খুঁজে না পাও, তবে "NOT_FOUND" বা "0" দিও।`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
    ]);

    const responseText = result.response.text();
    // Gemini থেকে পাওয়া টেক্সট থেকে JSON বের করা
    const jsonMatch = responseText.match(/\{.*\}/s);
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { utr: "NOT_FOUND", amount: "0" };

    return res.json({ success: true, ...data });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AI Server running on port ${PORT}`));
