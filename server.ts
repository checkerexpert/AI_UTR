import express from "express";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "15mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    let base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
    }

    if (base64Image.includes(",")) {
      base64Image = base64Image.split(",")[1];
    }

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
    
    // কনসোলে চেক করার জন্য - রেন্ডার লগে গিয়ে দেখো কি টেক্সট পড়ছে
    console.log("OCR Extracted Result:", rawResult);

    // 🔍 শক্তিশালী Regex লজিক:
    // UTR: ১২-২২ ডিজিটের যেকোনো নাম্বার
    const utrMatch = rawResult.match(/(?:UTR|Ref|Txn|Transaction|Reference|Number)[:\s\n]*([A-Z0-9]{10,25})/i);
    
    // Amount: Amount/Total/Rs এর পরে থাকা সংখ্যা (কমা বা ডট সহ)
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs|Paid|Amount\s*Total)[:\s\n]*([0-9,]+(?:\.[0-9]{2})?)/i);
    
    const utr = utrMatch ? utrMatch[1] : "000000000000";
    const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : "0.00"; // কমা থাকলে তা সরিয়ে সংখ্যা বানানো হয়েছে

    const responsePayload = {
      status: "success",
      result: rawResult,
      utr: utr,
      amount: amount,
      data: { utr: utr, amount: amount }
    };

    return res.json(responsePayload);

  } catch (error: any) {
    console.error("Master Server Error:", error);
    return res.status(500).json({ status: "error", error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
