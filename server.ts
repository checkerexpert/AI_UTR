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

// 🌐 🟢 আপনার নতুন লাইভ স্পেসের সঠিক FastAPI এন্ডপয়েন্ট
const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space";

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    console.log("Sending image to Custom FastAPI Docker Server...");

    // কাস্টম FastAPI-তে স্ট্যান্ডার্ড POST রিকোয়েস্ট পাঠানো
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: image })
    });

    if (!hfResponse.ok) {
      throw new Error(`FastAPI server responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    console.log("Data received from FastAPI:", hfData);
    
    // ফ্রন্টএন্ডে ফাইনাল রেজাল্ট পাঠিয়ে দেওয়া
    return res.json({ result: hfData.result });

  } catch (error: any) {
    console.error("Error during OCR scanning:", error.message);
    res.status(500).json({ error: `OCR Failed: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Back-end Server running on port ${PORT}`);
  console.log(`🔗 Connected to Custom API: ${HF_API_URL}`);
});
