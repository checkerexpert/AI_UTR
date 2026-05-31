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

    // 1. UTR Logic: 12-20 digits
    const utrMatch = rawResult.match(/\b\d{12,20}\b/);
    const finalUtr = utrMatch ? utrMatch[0] : "NOT_FOUND";

    // 2. Keyword-based Amount Logic: (এই লজিকটি কি-ওয়ার্ডের আশেপাশে সংখ্যা খোঁজে)
    // এটি 'Amount', 'Total', 'Paid' বা 'Rs' এর আশেপাশে থাকা সংখ্যাকে প্রায়োরিটি দেবে
    const amountRegex = /(?:Amount|Total|Paid|Rs|INR)[:\s]*(\d{1,3}(?:,\d{3})*\.\d{2})/i;
    const match = rawResult.match(amountRegex);
    
    let finalAmount = "0.00";
    if (match && match[1]) {
      finalAmount = match[1].replace(/,/g, '');
    } else {
      // যদি কি-ওয়ার্ড না পায়, তবেই শুধু সবচেয়ে বড় সংখ্যাটি নেবে
      const allNumbers = rawResult.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g) || [];
      if (allNumbers.length > 0) {
        finalAmount = Math.max(...allNumbers.map(n => parseFloat(n.replace(/,/g, '')))).toFixed(2);
      }
    }

    return res.json({
      success: true,
      utr: finalUtr,
      amount: finalAmount,
      debug: rawResult
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Scan Failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running`));
