import express from "express";
import fetch from "node-fetch";

const app = express();

// ইমেজের বেস৬৪ ডাটা সাইজ বড় হতে পারে, তাই লিমিট ১০এমবি করে দেওয়া হলো
app.use(express.json({ limit: "10mb" }));

// 🌐 আপনার লাইভ Hugging Face PaddleOCR API লিংক
const HF_API_URL = "https://checkerexpert-ai-utr.hf.space/call/predict";

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body; // ফ্রন্টএন্ড থেকে আসা বেস৬৪ ইমেজ

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    console.log("Sending image to Hugging Face PaddleOCR Server...");

    // হাগিং ফেসের গ্রাডিও এপিআই-তে রিকোয়েস্ট পাঠানো
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        data: [image] // পাইথনের app.py ফাইলের ইনপুট হিসেবে পাঠানো হচ্ছে
      })
    });

    // হাগিং ফেস থেকে আসা রেসপন্স চেক করা
    if (!hfResponse.ok) {
      throw new Error(`Hugging Face server responded with status: ${hfResponse.status}`);
    }

    const hfData = await hfResponse.json();
    console.log("Response received from Hugging Face:", hfData);
    
    // এপিআই থেকে প্রাপ্ত ফাইনাল OCR টেক্সট রেজাল্ট ফিল্টার করা
    if (hfData && hfData.data && hfData.data[0]) {
      const ocrResult = hfData.data[0];
      
      // ফ্রন্টএন্ড যেভাবে রেজাল্ট আশা করে, ঠিক সেই ফরম্যাটে পাঠানো হলো
      return res.json({ result: ocrResult });
    } else {
      throw new Error("Invalid or empty data received from OCR Server");
    }

  } catch (error: any) {
    console.error("Error during OCR scanning:", error.message);
    res.status(500).json({ error: `OCR Failed: ${error.message}` });
  }
});

// রেন্ডার (Render) বা লোকাল পোর্টের জন্য কনফিগারেশন
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Connected OCR Endpoint: ${HF_API_URL}`);
});
