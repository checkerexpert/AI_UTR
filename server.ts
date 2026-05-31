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

    // 🎯 GEMINI-STYLE LOGIC (Logic for Extraction)
    
    // 1. UTR Logic: 12-20 digits only, filtering out dates or other numbers
    const utrRegex = /\b\d{12,20}\b/;
    const utrMatch = rawResult.match(utrRegex);
    const finalUtr = utrMatch ? utrMatch[0] : "NOT_FOUND";

    // 2. Amount Logic: Looking specifically for currency patterns
    // This finds numbers with 2 decimals, common in payment slips
    const amountRegex = /(\d{1,3}(?:,\d{3})*\.\d{2})/;
    const amountMatches = rawResult.match(new RegExp(amountRegex, 'g')) || [];
    
    // Clean and find the most logical amount (highest value usually)
    const amounts = amountMatches
      .map(n => parseFloat(n.replace(/,/g, '')))
      .filter(n => n > 0);
    
    const finalAmount = amounts.length > 0 ? Math.max(...amounts).toFixed(2) : "0.00";

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult // যদি এখনো ভুল হয়, এই debug টেক্সটটিই সমস্যা
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running`));
