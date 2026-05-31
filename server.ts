import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    const { image, userId } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: "Image missing" });
    }

    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image })
    });

    const hfData = await hfResponse.json();
    const rawResult = hfData.extracted_text || "";

    // 🎯 মাস্টার Regex লজিক
    
    // ১. UTR: যেকোনো ১২ থেকে ২০ ডিজিটের সংখ্যা খুঁজবে (যেখানে UTR বা Ref বা Txn লেখা থাকতে পারে)
    const utrMatch = rawResult.match(/(?:UTR|Ref|Txn|Transaction|Reference)[:\s\n]*(\d{12,20})/i);
    
    // ২. Amount: Amount/Total/Rs/INR/₹ এর পরে থাকা সংখ্যা (যেমন: 500.00 বা 1,500.00)
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs|Paid|Amt|₹)[:\s\n]*([\d,]+\.\d{2})/i);

    const finalUtr = utrMatch ? utrMatch[1] : "NOT_FOUND";
    const finalAmount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0";

    // 🎯 ফ্রন্টএন্ডের সব শর্ত পূরণ করা রেসপন্স
    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      userId: userId || "N/A",
      debug: rawResult // ফ্রন্টএন্ডে বা লগে দেখতে পারবে OCR কী পড়েছে
    });

  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
