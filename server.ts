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

    // 1. UTR: Find all potential 12-20 digit IDs
    const allIds = rawResult.match(/\b\d{12,20}\b/g) || [];
    const finalUtr = allIds.length > 0 ? allIds[0] : "NOT_FOUND";

    // 2. Amount: Intelligent extraction logic
    // We filter numbers that are potentially amounts (e.g., xxx.xx)
    const allNumbers = rawResult.match(/\d{1,3}(,\d{3})*(\.\d{1,2})/g) || [];
    
    // Sort all found numbers and take the largest one as the transaction amount
    const finalAmount = allNumbers.length > 0 
      ? allNumbers
          .map(n => parseFloat(n.replace(/,/g, '')))
          .sort((a, b) => b - a)[0]
          .toFixed(2)
      : "0.00";

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult // Important for debugging
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
