import express from "express";

const app = express();
app.use(express.json({ limit: "10mb" }));

// 🌐 ওয়ান-শট প্রিডিকশন এন্ডপয়েন্ট (এটি সরাসরি রেজাল্ট দেবে)
const HF_API_URL = "https://checkerexpert-ai-utr.hf.space/api/predict";

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    console.log("Sending image to Hugging Face via standard fetch...");

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Fixed OCR Endpoint: ${HF_API_URL}`);
});
