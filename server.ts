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

    // 1. UTR: Find the longest sequence of 12-20 digits
    const utrMatch = rawResult.match(/\b\d{12,20}\b/);
    const finalUtr = utrMatch ? utrMatch[0] : "NOT_FOUND";

    // 2. Amount: Intelligent extraction
    // Finds numbers that look like currency (e.g., 500.00, 1,200.50)
    // Then filters them to find the most probable transaction amount
    const amountPatterns = rawResult.match(/[\d,]+\.\d{1,2}/g) || [];
    let finalAmount = "0.00";

    if (amountPatterns.length > 0) {
      // Sort numbers to find the most significant one
      const parsedAmounts = amountPatterns.map(n => parseFloat(n.replace(/,/g, '')));
      // We assume the largest decimal number in a payment slip is the transaction amount
      const maxVal = Math.max(...parsedAmounts);
      finalAmount = maxVal.toFixed(2);
    }

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult // VERY IMPORTANT: Check this in your logs
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
