import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    const { image, userId } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image missing" });

    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image })
    });

    const hfData = await hfResponse.json();
    const text = hfData.extracted_text || "";

    // 🎯 লজিক: আমরা টেক্সটকে ছোট ছোট লাইনে ভাগ করছি (স্লিপ সাধারণত লাইনে লাইনে থাকে)
    const lines = text.split('\n');

    let detectedUtr = "NOT_FOUND";
    let detectedAmount = "0.00";
    let maxAmount = 0;

    lines.forEach((line: string) => {
      // UTR এর জন্য: ১২ থেকে ২০ ডিজিটের লম্বা সংখ্যা
      const utrMatch = line.match(/\b\d{12,20}\b/);
      if (utrMatch) detectedUtr = utrMatch[0];

      // অ্যামাউন্টের জন্য: প্রতিটি লাইনে দশমিকসহ সংখ্যা খুঁজে বের করা
      const numMatch = line.match(/(\d{1,3}(,\d{3})*(\.\d{1,2}))/);
      if (numMatch) {
        const val = parseFloat(numMatch[1].replace(/,/g, ''));
        // স্লিপে সাধারণত অ্যামাউন্ট সবচেয়ে বড় সংখ্যা হয়, তাই যেটি বড় তাকেই ধরছি
        if (val > maxAmount) {
          maxAmount = val;
          detectedAmount = val.toFixed(2);
        }
      }
    });

    return res.json({
      success: true,
      utr: detectedUtr,
      amount: detectedAmount,
      userId: userId || "N/A",
      debug: text // যদি ভুল হয়, আমাকে এই ডিবাগ টেক্সটটি দিও
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Logic Server running on port ${PORT}`));
