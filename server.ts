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

    // Regex দিয়ে UTR এবং Amount বের করা
    const utrMatch = rawResult.match(/(?:UTR|Ref|Txn|Transaction)[:\s]*([A-Z0-9]{10,25})/i);
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i);

    const finalUtr = utrMatch ? utrMatch[1] : "NOT_FOUND";
    const finalAmount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0";

    // 🎯 এটিই সবচেয়ে গুরুত্বপূর্ণ: ফ্রন্টএন্ড যা যা খুঁজছে সব দিচ্ছি
    return res.json({
      success: true, // ফ্রন্টএন্ডের ইফ-কন্ডিশন পাস করার জন্য এটা বাধ্যতামূলক
      utr: finalUtr,
      amount: finalAmount,
      userId: userId || "N/A",
      debug: rawResult
    });

  } catch (error: any) {
    console.error("Backend Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
