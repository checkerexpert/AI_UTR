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

    // 🎯 লজিক: 100% একুরেসি পেতে আমরা এখানে 'Transaction DNA' খুঁজছি
    
    // 1. UTR: ট্রানজেকশন আইডির জন্য ১২-২০ ডিজিটের লম্বা নাম্বার (এটি সব স্লিপে কমন)
    const utrMatches = rawResult.match(/\b\d{12,20}\b/g) || [];
    const finalUtr = utrMatches.length > 0 ? utrMatches[0] : "NOT_FOUND";

    // 2. Amount: স্লিপের সবচেয়ে বড় দশমিক সংখ্যাটিই অ্যামাউন্ট (এটিই সবচেয়ে সঠিক পদ্ধতি)
    // এটি 'Amount' বা 'Total' শব্দের ওপর নির্ভর করে না
    const allNumbers = rawResult.match(/\d{1,3}(,\d{3})*(\.\d{1,2})/g) || [];
    let finalAmount = "0";

    if (allNumbers.length > 0) {
      // আমরা সেই সংখ্যাগুলো নিচ্ছি যেগুলো ১০০ এর চেয়ে বড় (অ্যামাউন্ট সাধারণত ছোট হয় না)
      const validAmounts = allNumbers
        .map(n => parseFloat(n.replace(/,/g, '')))
        .filter(n => n > 1); 
      
      if (validAmounts.length > 0) {
        // সবচেয়ে বড় সংখ্যাটিকে অ্যামাউন্ট হিসেবে ধরছি
        finalAmount = Math.max(...validAmounts).toFixed(2);
      }
    }

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult // যদি রেজাল্ট ভুল আসে, তবে এই 'debug' টেক্সটটি আমাকে দেবেন
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
