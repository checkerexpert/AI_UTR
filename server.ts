import express from "express";

const app = express();

// CORS পলিসি হ্যান্ডেল করার জন্য মিডলওয়্যার
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "10mb" }));

// 🌐 🟢 ৪০৫ এরর ফিক্স করার জন্য গ্রাডিও-র সঠিক লাইভ এন্ডপয়েন্ট
const HF_API_URL = "https://checkerexpert-ai-utr.hf.space/run/predict";

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    console.log("Sending image to Hugging Face via fixed /run/predict endpoint...");

    // গ্রাডিও অ্যাপের রিকোয়েস্ট স্ট্রাকচার অনুযায়ী ডাটা পাঠানো
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        data: [image] // আপনার পাইথন app.py-এর ইনপুট
      })
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face server responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    console.log("Response received successfully:", hfData);
    
    // গ্রাডিও রেসপন্স থেকে ডেটা ফিল্টার করা
    if (hfData && hfData.data && hfData.data[0]) {
      const ocrResult = hfData.data[0];
      return res.json({ result: ocrResult });
    } else {
      throw new Error("Invalid response format from OCR Server");
    }

  } catch (error: any) {
    console.error("Error during OCR scanning:", error.message);
    res.status(500).json({ error: `OCR Failed: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Target Endpoint: ${HF_API_URL}`);
});
