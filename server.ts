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

    // 1. UTR: Searching for 12 to 20 digits.
    // If multiple found, pick the one that is most likely the UTR based on standard length.
    const utrMatches = rawResult.match(/\b\d{12,20}\b/g) || [];
    const finalUtr = utrMatches.length > 0 ? utrMatches[utrMatches.length - 1] : "NOT_FOUND";

    // 2. Amount: Searching for any number that looks like a currency amount.
    // Logic: It must have at least one digit, optional comma, and mandatory two decimal places.
    const allNumbers = rawResult.match(/\d{1,3}(?:,\d{3})*(?:\.\d{2})/g) || [];
    
    let finalAmount = "0.00";
    if (allNumbers.length > 0) {
      // Logic: Pick the largest number found that looks like an amount.
      const parsedAmounts = allNumbers
        .map(n => parseFloat(n.replace(/,/g, '')))
        .filter(n => n > 0);
      
      if (parsedAmounts.length > 0) {
        finalAmount = Math.max(...parsedAmounts).toFixed(2);
      }
    }

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult 
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Error processing the slip" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
