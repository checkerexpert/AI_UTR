import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

// Connector for the OCR engine
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

    // UTR: Strictly extracting 12-20 digit ID without internal spaces
    const utrMatch = rawResult.match(/\b\d{12,20}\b/);
    const finalUtr = utrMatch ? utrMatch[0] : "NOT_FOUND";

    // Amount: Extracting the largest value following your strict logic
    const amountMatches = rawResult.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g) || [];
    let finalAmount = "0.00";
    
    if (amountMatches.length > 0) {
      const parsedAmounts = amountMatches.map(n => parseFloat(n.replace(/,/g, '')));
      finalAmount = Math.max(...parsedAmounts).toFixed(2);
    }

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      userId: userId || "N/A"
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Processing failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
