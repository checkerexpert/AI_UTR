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

    // --- DEEP EXTRACTION LOGIC ---
    
    // 1. UTR: Searching for the most consistent long-digit sequence
    // Most UTRs are 12 to 20 digits long.
    const allIds = rawResult.match(/\b\d{12,20}\b/g) || [];
    const finalUtr = allIds.length > 0 ? allIds[0] : "NOT_FOUND";

    // 2. Amount: We filter out non-amount numbers by looking for decimal points
    // and then pick the largest numeric value found in the text.
    const numberMatches = rawResult.match(/[\d,]+\.\d{1,2}/g) || [];
    
    let finalAmount = "0.00";
    if (numberMatches.length > 0) {
      // Clean and sort numbers to find the highest value (the transaction amount)
      const cleanedNumbers = numberMatches.map(n => parseFloat(n.replace(/,/g, '')));
      finalAmount = Math.max(...cleanedNumbers).toFixed(2);
    }

    // ----------------------------

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult 
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Logic Running on port ${PORT}`));
