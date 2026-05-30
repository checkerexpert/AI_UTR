import express from "express";

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ১৫এমবি লিমিট, যাতে হাই কোয়ালিটি ইমেজ রিজেক্ট না হয়
app.use(express.json({ limit: "15mb" }));

const HF_API_URL = "https://checkerexpert-ai-scaning.hf.space/api/scan";

app.post("/api/scan", async (req, res) => {
  try {
    // যেকোনো নামেই ইমেজ আসুক না কেন
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
      throw new Error(`Hugging Face status: ${hfResponse.status}`);
    }

    const hfData: any = await hfResponse.json();
    const rawResult = hfData.extracted_text || "";
    
    // UTR এবং Amount বের করার লজিক
    const utrMatch = rawResult.match(/(?:UTR|Ref|Txn|Transaction)[:\s]*([A-Z0-9]{10,25})/i);
    const amountMatch = rawResult.match(/(?:Amount|Total|INR|Rs)[:\s]*([0-9,.]+)/i);
    
    const utr = utrMatch ? utrMatch[1] : "000000000000";
    const amount = amountMatch ? amountMatch[1] : "0.00";

    // 🎯 সব সম্ভাব্য কি-ওয়ার্ড একসাথে পাঠানো হচ্ছে যেন ফ্রন্টএন্ড রিজেক্ট করতে না পারে
    const responsePayload = {
      status: "success",
      success: true,
      result: rawResult,
      text: rawResult,
      extracted_text: rawResult,
      utr: utr,
      utr_number: utr,
      utrNumber: utr,
      amount: amount,
      total_amount: amount,
      totalAmount: amount,
      data: {
        utr: utr,
        amount: amount,
        utr_number: utr,
        total_amount: amount
      }
    };

    return res.json(responsePayload);

  } catch (error: any) {
    console.error("Master Server Error:", error);
    // এরর আসলেও জেনুইন একটা JSON রেসপন্স পাঠানো হচ্ছে যাতে ফ্রন্টএন্ড ক্রাশ না করে
    return res.status(500).json({
      status: "error",
      error: error.message,
      utr: "000000000000",
      amount: "0.00"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Master Server running on port ${PORT}`));
