import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image missing" });

    const base64Image = image.includes(",") ? image.split(",")[1] : image;
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image })
    });

    const hfData = await hfResponse.json();
    const rawResult = hfData.extracted_text || "";

    // 1. UTR: Searching for the exact 12-20 digit transaction ID
    const utrMatch = rawResult.match(/\b\d{12,20}\b/);
    const finalUtr = utrMatch ? utrMatch[0] : "NOT_FOUND";

    // 2. Amount: Searching for patterns like 500.00, 1,200.00, 5000 etc
    // We look for patterns that don't look like dates (e.g., ignoring 31.05.2026)
    const allNumbers = rawResult.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g) || [];
    
    let finalAmount = "0.00";
    if (allNumbers.length > 0) {
      // Logic: Transaction amount is usually the largest number with two decimal places
      const parsedAmounts = allNumbers.map(n => parseFloat(n.replace(/,/g, '')));
      finalAmount = Math.max(...parsedAmounts).toFixed(2);
    }

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult 
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Processing Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
