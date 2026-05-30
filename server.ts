import express from "express";

const app = express();

// 🔓 CORS ব্লকিং দূর করার মিডলওয়্যার
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "10mb" }));

// 🌐 আপনার বর্তমান লাইভ স্পেসের এন্ডপয়েন্ট (ai-scaning)
const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    // 🔍 ফ্রন্টঅ্যান্ড একেক সময় একেক নামে ইমেজ পাঠাতে পারে (image, file, img, base64)
    // তাই আমরা সবকটি চেক করছি যাতে প্যারামিটার রিজেক্ট না হয়
    const base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      console.log("Received body:", req.body); // লগে দেখার জন্য কী ডাটা আসছে
      return res.status(400).json({ error: "Image parameter is missing from front-end" });
    }

    console.log("Forwarding clean data to Hugging Face FastAPI...");

    // হাগিং ফেসের app.py ঠিক যেভাবে {"image": "base64..."} ফরমেটে ডাটা চায়, ঠিক সেভাবে পাঠানো হচ্ছে
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }) 
    });

    if (!hfResponse.ok) {
      throw new Error(`FastAPI server responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    console.log("Data received from FastAPI:", hfData);
    
    // ফ্রন্টঅ্যান্ড যেভাবে রেজাল্ট আশা করে, সেই অবজেক্ট ফরমেটেই ডাটা ব্যাক করা হলো
    return res.json({ result: hfData.result });

  } catch (error: any) {
    console.error("Error during OCR scanning:", error.message);
    res.status(500).json({ error: `OCR Failed: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Robust Back-end Server running on port ${PORT}`);
});
