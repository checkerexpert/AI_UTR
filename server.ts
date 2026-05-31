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
    const rawResult = hfData.extracted_text || "";

    // 1. UTR Logic: 12-20 ডিজিটের লম্বা সংখ্যা খুঁজে বের করা
    const utrMatch = rawResult.match(/\b\d{12,20}\b/);
    
    // 2. Amount Logic: এটি দশমিকের পর ১ বা ২ ঘর এবং কমা যুক্ত সংখ্যা খুঁজে নেবে
    // Regex টি যেকোনো কি-ওয়ার্ড (Amount/Total/Rs/₹) এর পরে থাকা সংখ্যা ধরবে
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs|Amt|Paid|Value|Price|₹|Balance)[:\s\n]*([\d,]+(?:\.\d{1,2})?)/i) 
                     || rawResult.match(/(?:Rs\.?|₹)\s?([\d,]+(?:\.\d{1,2})?)/i)
                     || rawResult.match(/([\d,]+(?:\.\d{1,2})?)/);

    const finalUtr = utrMatch ? utrMatch[0] : "NOT_FOUND";
    
    // অ্যামাউন্ট ক্লিন করা: কমা সরাচ্ছি এবং শেষে .00 যোগ করছি যদি দশমিক না থাকে
    let amountStr = amountMatch ? (amountMatch[1] || amountMatch[0]).replace(/,/g, '') : "0.00";
    if (!amountStr.includes('.')) {
        amountStr = amountStr + ".00";
    }

    return res.json({
      success: true,
      utr: finalUtr,
      amount: amountStr,
      userId: userId || "N/A",
      debug: rawResult 
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
