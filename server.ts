import express from "express";

const app = express();

// 🔓 CORS পলিসি হ্যান্ডেল করার জন্য মিডলওয়্যার (যাতে ফ্রন্টএন্ড থেকে ব্লক না হয়)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // সব ডোমেন থেকে রিকোয়েস্ট অ্যালাউ করা হলো
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  
  // OPTIONS রিকোয়েস্টের জন্য দ্রুত রেসপন্স পাঠানো
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ইমেজের বেস৬৪ ডাটার সাইজ বড় হতে পারে, তাই লিমিট ১০এমবি করে দেওয়া হলো
app.use(express.json({ limit: "10mb" }));

// 🌐 আপনার লাইভ Hugging Face PaddleOCR API লিংক
const HF_API_URL = "https://checkerexpert-ai-utr.hf.space/api/predict";

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body; // ফ্রন্টএন্ড থেকে আসা বেস৬৪ ইমেজ

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    console.log("Sending image to Hugging Face via global fetch...");

    // নোড ২৪ এর বিল্ট-ইন গ্লোবাল fetch ব্যবহার করা হচ্ছে
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        data: [image]
      })
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face server responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    console.log("Response received from Hugging Face:", hfData);
    
    // এপিআই থেকে প্রাপ্ত ফাইনাল OCR টেক্সট রেজাল্ট ফিল্টার করা
    if (hfData && hfData.data && hfData.data[0]) {
      const ocrResult = hfData.data[0];
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
  console.log(`🔗 Fixed OCR Endpoint: ${HF_API_URL}`);
});
