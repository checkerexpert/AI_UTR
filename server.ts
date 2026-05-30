import express from "express";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "15mb" })); // लिमिट थोड़ी बढ़ा दी ताकि बड़ी इमेजेस न अटकें

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    let base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
    }

    // हगिंग फेस को सॉलिड JSON भेजना
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ image: base64Image })
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    
    // अगर पाइथन एंड से स्टेटस फेल्ड आता है
    if (hfData.status === "failed") {
      return res.status(400).json({ error: hfData.extracted_text });
    }

    const rawResult = hfData.extracted_text || "";
    
    // UTR & Amount Regex ফিল্টারিং
    const utrMatch = rawResult.match(/(?:UTR|Ref|Transaction)[:\s]*([A-Z0-9]+)/i);
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs)[:\s]*([0-9,.]+)/i);
    
    const extractedUTR = utrMatch ? utrMatch[1] : "Not Found";
    const extractedAmount = amountMatch ? amountMatch[1] : "Not Found";

    return res.json({
      result: rawResult,                                  
      text: rawResult,                                    
      utr: extractedUTR,                                  
      amount: extractedAmount,                            
      data: { utr: extractedUTR, amount: extractedAmount } 
    });

  } catch (error: any) {
    console.error("Hugging Face Connection Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
