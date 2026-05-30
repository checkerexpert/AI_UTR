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
    const rawResult = hfData.extracted_text || "";
    
    // 🔍 সুপার শক্তিশালী ও রিল্যাক্সড Regex (যা ওল্ড রিজেকশন আটকাবে)
    // এটি UTR, Ref No, Txn ID এবং যেকোনো ১২-২২ ডিজিটের সংখ্যাকে ট্র্যাক করবে
    const utrMatch = rawResult.match(/(?:UTR|Ref|Txn|Transaction|Ref\s*No)[:\s-]*([A-Z0-9]{12,22})/i) || rawResult.match(/\b\d{12,22}\b/);
    
    // অ্যামাউন্ট ধরার জন্য ₹, Rs, INR বা শণাক্তকারী টেক্সটের পরের ডিজিট ট্র্যাক করবে
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs|Paid)[:\s-]*([0-9,.]+)/i);
    
    const extractedUTR = utrMatch ? utrMatch[1] || utrMatch[0] : "Not Found";
    const extractedAmount = amountMatch ? amountMatch[1] : "Not Found";

    // 🎯 যদি ব্যাকএন্ড বা ফ্রন্টএন্ড "Not Found" দেখে প্যারামিটার রিজেক্ট করে, 
    // তবে সুরক্ষার জন্য আমরা ফাঁকা স্ট্রিং বা ডিফল্ট পাস করে দিচ্ছি যাতে ক্রাশ না করে
    return res.json({
      result: rawResult,                                  
      text: rawResult,                                    
      utr: extractedUTR !== "Not Found" ? extractedUTR : "",                                  
      amount: extractedAmount !== "Not Found" ? extractedAmount : "",                            
      data: { 
        utr: extractedUTR !== "Not Found" ? extractedUTR : "", 
        amount: extractedAmount !== "Not Found" ? extractedAmount : "" 
      } 
    });

  } catch (error: any) {
    console.error("Hugging Face Connection Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
