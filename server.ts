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

    // --- স্মার্ট এক্সট্রাকশন লজিক ---

    // ১. UTR এক্সট্রাকশন: ১২ থেকে ২০ ডিজিটের যেকোনো লম্বা সংখ্যা
    const allIds = rawResult.match(/\b\d{12,20}\b/g) || [];
    const finalUtr = allIds.length > 0 ? allIds.sort((a, b) => b.length - a.length)[0] : "NOT_FOUND";

    // ২. অ্যামাউন্ট এক্সট্রাকশন: সব দশমিক সংখ্যা বের করে সবচেয়ে বড়টিকে নেওয়া
    // এটি কি-ওয়ার্ড ছাড়াই কাজ করবে, শুধু ফরম্যাট (যেমন: 500.00 বা 1,500.00) খুজবে
    const allNumbers = rawResult.match(/[\d,]+\.\d{1,2}/g) || [];
    const finalAmount = allNumbers.length > 0 
      ? allNumbers
          .map(n => parseFloat(n.replace(/,/g, '')))
          .sort((a, b) => b - a)[0]
          .toFixed(2)
      : "0.00";

    // ----------------------------

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      userId: userId || "N/A",
      debug: rawResult // যদি রেজাল্ট ভুল আসে, তবে ব্রাউজার নেটওয়ার্ক ট্যাবে এই 'debug' টেক্সটটি দেখো
    });

  } catch (error: any) {
    console.error("Backend Processing Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
