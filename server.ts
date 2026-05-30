import express from "express";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "10mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    const base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
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
    
    // হাগিং ফেসের রেজাল্ট স্ট্রিংটি বের করা (যেমন: "UTR: 123456789012 | Amount: 500")
    const rawResult = hfData.result || "";
    
    // 🔍 রেজাল্ট থেকে UTR এবং Amount আলাদা করে অবজেক্ট বানানো (ফ্রন্টএন্ডের সুরক্ষার জন্য)
    const utrMatch = rawResult.match(/UTR:\s*([^\s|]+)/);
    const amountMatch = rawResult.match(/Amount:\s*([^\s|]+)/);
    
    const extractedUTR = utrMatch ? utrMatch[1] : "Not Found";
    const extractedAmount = amountMatch ? amountMatch[1] : "Not Found";

    // 🎯 ফ্রন্টএন্ড যেকোনো ফরমেটে ডাটা চাইলে যেন রিজেক্ট করতে না পারে, তাই সবকটি ফরমেট একসাথে পাঠানো হলো
    return res.json({
      result: rawResult,                      // ফরমেট ১
      text: rawResult,                        // ফরমেট ২
      utr: extractedUTR,                      // ফরমেট ৩ (আলাদা অবজেক্ট)
      amount: extractedAmount,                // ফরমেট ৪
      data: { utr: extractedUTR, amount: extractedAmount } // ফরমেট ৫
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
