import express from "express";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ইমেজ ডাটা যেন মাঝপথে কেটে না যায় তাই ১০এমবি লিমিট
app.use(express.json({ limit: "10mb" }));

// তোমার হাগিং ফেস স্পেসের সঠিক এপিআই ইউআরএল
const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    // ফ্রন্টএন্ড থেকে যেকোনো কি-ওয়ার্ডে বেস৬৪ আসুক, এটি রিসিভ করবে
    let base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
    }

    // ১. হাগিং ফেস পাইথন কোডের সুবিধার্থে বেস৬৪ হেডার ক্লিনিং
    if (base64Image.includes(",")) {
      base64Image = base64Image.split(",")[1];
    }

    // ২. হাগিং ফেসের JSON API-তে ঠিক যেভাবে ডাটা দরকার, সেভাবে পাঠানো হচ্ছে
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
    
    // ৩. হাগিং ফেসের Python App থেকে আসা আসল টেক্সট রিসিভ করা
    const rawResult = hfData.extracted_text || "";
    
    // 🔍 টেক্সট থেকে UTR এবং Amount ফিল্টার করার রেগুলার এক্সপ্রেশন
    const utrMatch = rawResult.match(/(?:UTR|Ref|Transaction)[:\s]*([A-Z0-9]+)/i);
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs)[:\s]*([0-9,.]+)/i);
    
    const extractedUTR = utrMatch ? utrMatch[1] : "Not Found";
    const extractedAmount = amountMatch ? amountMatch[1] : "Not Found";

    // 🎯 ফ্রন্টএন্ডের পুরোনো ৫টি ফরমেটই এখানে দেওয়া হলো যাতে ফ্রন্টএন্ড রিজেক্ট না হয়
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

// 🚀 রেন্ডারের ডাইনামিক পোর্টের সাথে কানেক্ট হওয়ার জন্য (ড্যাশবোর্ডের ম্যানুয়াল PORT ডিলিট করার পর এটি অটো কাজ করবে)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
