import express from "express";
import cors from "cors";

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

// API Endpoint
app.post("/api/scan", async (req, res) => {
  try {
    const { image, file, img, base64 } = req.body;
    let base64Image = image || file || img || base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
    }

    // Cleaning Base64 header
    if (typeof base64Image === 'string' && base64Image.includes(",")) {
      base64Image = base64Image.split(",")[1];
    }

    // Hugging Face Request
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image })
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    const rawResult = hfData.extracted_text || "";

    // Regex Extraction
    const utrMatch = rawResult.match(/(?:UTR|Ref|Txn|Transaction)[:\s]*([A-Z0-9]{10,25})/i);
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs)[:\s]*([0-9,]+(?:\.[0-9]{2})?)/i);

    const utr = utrMatch ? utrMatch[1] : "000000000000";
    const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0.00";

    // Standardized Response
    return res.json({
      status: "success",
      result: rawResult,
      utr: utr,
      amount: amount,
      data: { utr, amount }
    });

  } catch (error: any) {
    console.error("Master Server Error:", error);
    return res.status(500).json({ 
      status: "error", 
      message: error.message,
      utr: "000000000000",
      amount: "0.00"
    });
  }
});

// Port configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
