import express from "express";
import FormData from "form-data"; // হাগিং ফেসের Multipart Form-Data এরর ফিক্স করার জন্য

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ১০এমবি লিমিট ঠিক আছে
app.use(express.json({ limit: "10mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    let base64Image = req.body.image || req.body.file || req.body.img || req.body.base64;

    if (!base64Image) {
      return res.status(400).json({ error: "Image parameter missing" });
    }

    // ১. যদি বেস৬৪ ডাটাতে 'data:image/...;base64,' হেডার থাকে, তবে তা পরিষ্কার করা
    if (base64Image.includes(",")) {
      base64Image = base64Image.split(",")[1];
    }

    // ২. বেস৬৪ স্ট্রিংকে রিয়েল বাইনারি বাফারে (Buffer) রূপান্তর করা
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // ৩. হাগিং ফেস পাইথন ব্যাকএন্ডের রিকোয়ারমেন্ট অনুযায়ী Multipart Form-Data তৈরি করা
    const formData = new FormData();
    // পাইথন কোড 'file' ফিল্ড খুঁজছে, তাই এখানে 'file' নামেই বাফারটি পাস করতে হবে
    formData.append("file", imageBuffer, { filename: "scan.jpg", contentType: "image/jpeg" });

    // ৪. হাগিং ফেসে রিকোয়েস্ট পাঠানো (সঠিক হেডার সহ)
    const hfResponse = await fetch(HF_API_URL, {
      method: "POST",
      headers: formData.getHeaders(), // এটি স্বয়ংক্রিয়ভাবে সঠিক multipart/form-data boundary সেট করবে
      body: formData as any
    });

    if (!hfResponse.ok) {
      throw new Error(`Hugging Face responded with status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    
    // হাগিং ফেসের রেসপন্স থেকে এক্সট্রাক্ট করা টেক্সট নেওয়া
    // যদি তোমার পাইথন কোড সরাসরি {"extracted_text": "..."} পাঠায়, তবে hfData.extracted_text ব্যবহার হবে
    const rawResult = hfData.extracted_text || hfData.result || "";
    
    // 🔍 রেজাল্ট থেকে UTR এবং Amount ফিল্টার করা
    const utrMatch = rawResult.match(/UTR:\s*([^\s|]+)/);
    const amountMatch = rawResult.match(/Amount:\s*([^\s|]+)/);
    
    const extractedUTR = utrMatch ? utrMatch[1] : "Not Found";
    const extractedAmount = amountMatch ? amountMatch[1] : "Not Found";

    // 🎯 ফ্রন্টএন্ডের ৫টি ফরম্যাটই অক্ষুণ্ণ রাখা হলো
    return res.json({
      result: rawResult,                                  
      text: rawResult,                                    
      utr: extractedUTR,                                  
      amount: extractedAmount,                            
      data: { utr: extractedUTR, amount: extractedAmount } 
    });

  } catch (error: any) {
    console.error("HF Connection Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
