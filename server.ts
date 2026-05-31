import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    const base64Image = image.includes(",") ? image.split(",")[1] : image;

    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image })
    });

    const hfData = await hfResponse.json();
    const rawResult = hfData.extracted_text || "";

    // 🎯 Logic: Gemini-style context search
    // আমরা এমন সংখ্যা খুঁজছি যেগুলোর সামনে বা পেছনে 'Rs', 'INR', বা কোনো সিম্বল আছে
    // অথবা সেগুলো সাধারণত বড় ভ্যালু হয়
    
    // UTR: ১২-২০ ডিজিট
    const utrMatch = rawResult.match(/\b\d{12,20}\b/);
    
    // Amount: প্যাটার্ন খুঁজছি (যেমন: টাকা, অ্যামাউন্ট বা দশমিকের পর দুই ঘর)
    const amountRegex = /(?:Rs\.?|INR|Total|Amount|Paid)?\s*(\d{1,3}(?:,\d{3})*\.\d{2})/gi;
    let match;
    let bestAmount = 0;

    while ((match = amountRegex.exec(rawResult)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val > bestAmount) {
        bestAmount = val;
      }
    }

    return res.json({
      success: true,
      utr: utrMatch ? utrMatch[0] : "NOT_FOUND",
      amount: bestAmount.toFixed(2),
      debug: rawResult
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Logic Server running on port ${PORT}`));
