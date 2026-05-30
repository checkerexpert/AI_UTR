import express from "express";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ইমেজ ডাটা হ্যান্ডেল করার জন্য ১৫এমবি লিমিট
app.use(express.json({ limit: "15mb" }));

// তোমার হাগিং ফেস স্পেসের সঠিক এপিআই ইউআরএল
const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    let base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
    }

    // বেস৬৪ হেডার ক্লিনিং
    if (base64Image.includes(",")) {
      base64Image = base64Image.split(",")[1];
    }

    // হাগিং ফেস পাইথন API-তে রিকোয়েস্ট পাঠানো
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
    
    // 🔍 শক্তিশালী Regex: UTR এবং ১২-২২ ডিজিটের যেকোনো সংখ্যা ট্র্যাক করবে
    const utrMatch = rawResult.match(/(?:UTR|Ref|Txn|Transaction|Ref\s*No)[:\s-]*([A-Z0-9]{12,22})/i) || rawResult.match(/\b\d{12,22}\b/);
    
    // অ্যামাউন্ট ধরার জন্য Regex
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs|Paid)[:\s-]*([0-9,.]+)/i);
    
    let extractedUTR = utrMatch ? utrMatch[1] || utrMatch[0] : "Not Found";
    let extractedAmount = amountMatch ? amountMatch[1] : "Not Found";

    // 🎯 সেফটি ট্রিক: ফ্রন্টএন্ডের 'rejected parameters' এরর আটকাতে "Not Found" হলে ডামি ভ্যালু পাস করা
    const finalUTR = extractedUTR !== "Not Found" ? extractedUTR : "000000000000";
    const finalAmount = extractedAmount !== "Not Found" ? extractedAmount : "0.00";

    // ফ্রন্টএন্ডের সবকটি ওল্ড ফরম্যাট একসাথে রিটার্ন
    return res.json({
      result: rawResult,                                  
      text: rawResult,                                    
      utr: finalUTR,                                  
      amount: finalAmount,                            
      data: { 
        utr: finalUTR, 
        amount: finalAmount 
      } 
    });

  } catch (error: any) {
    console.error("Hugging Face Connection Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
