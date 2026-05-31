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

    // 1. UTR Logic: 12 থেকে 20 ডিজিটের লম্বা নাম্বার (সবচেয়ে সঠিক)
    const utrMatch = rawResult.match(/\b\d{12,20}\b/);
    
    // 2. Amount Logic: এটি ৩টি ধাপ চেক করবে
    // ধাপ A: 'Amount' বা 'Total' এর পরে সংখ্যা
    // ধাপ B: 'Rs' বা '₹' এর পরে সংখ্যা
    // ধাপ C: যদি কি-ওয়ার্ড না থাকে, তবে সরাসরি দশমিকসহ সংখ্যা (যেমন: 500.00)
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs|Amt|Paid|Value|Price)[:\s\n]*([\d,]+\.\d{2})/i) 
                     || rawResult.match(/(?:Rs\.?|₹)\s?([\d,]+\.\d{2})/i)
                     || rawResult.match(/([\d,]+\.\d{2})/);

    const finalUtr = utrMatch ? utrMatch[0] : "NOT_FOUND";
    const finalAmount = amountMatch ? amountMatch[1] || amountMatch[0] : "0";

    // ক্লিন অ্যামাউন্ট (কমা সরানো)
    const cleanedAmount = finalAmount.replace(/,/g, '');

    return res.json({
      success: true,
      utr: finalUtr,
      amount: cleanedAmount,
      userId: userId || "N/A",
      debug: rawResult 
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
