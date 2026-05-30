import express from "express";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-api-key");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ১০এমবি ইমেজ ডেটা হ্যান্ডেল করার জন্য
app.use(express.json({ limit: "10mb" }));

// তোমার হাগিং ফেস স্পেসের সঠিক URL
const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    // ফ্রন্টএন্ড যেকোনো কি-ওয়ার্ড (image/file/img/base64) পাঠালে তা রিসিভ করবে
    let base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
    }

    // হাগিং ফেসের পাইথন API-তে সরাসরি JSON বডি পাঠানো হচ্ছে
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }) 
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    
    // পাইথন ব্যাকএন্ড থেকে আসা এক্সট্রাক্ট করা টেক্সট
    const rawResult = hfData.extracted_text || "";
    
    // 🔍 রেজাল্ট থেকে UTR এবং Amount আলাদা করার Regex
    const utrMatch = rawResult.match(/(?:UTR|Ref|Transaction\s*No)[:\s]*([A-Z0-9]+)/i);
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs)[:\s]*([0-9,.]+)/i);
    
    const extractedUTR = utrMatch ? utrMatch[1] : "Not Found";
    const extractedAmount = amountMatch ? amountMatch[1] : "Not Found";

    // 🎯 ফ্রন্টএন্ডের সবকটি ওল্ড ফরম্যাট একসাথে রিটার্ন করা হলো
    return res.json({
      result: rawResult,                                  // ফরম্যাট ১
      text: rawResult,                                    // ফরম্যাট ২
      utr: extractedUTR,                                  // ফরম্যাট ৩
      amount: extractedAmount,                            // ফরম্যাট ৪
      data: { utr: extractedUTR, amount: extractedAmount } // ফরম্যাট ৫
    });

  } catch (error: any) {
    console.error("Master Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
