import { GoogleGenAI } from "@google/genai";

// এটি আপনার এক্সপ্রেস রাউটার বা পোস্ট মেথডের ভেতরের অংশ
app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    
    // ফ্রন্টএন্ড থেকে যদি কোনো কাস্টম কি পাঠানো হয়, তবে সেটি ব্যবহার হবে
    // আর যদি না পাঠানো হয়, তবে রেন্ডারের ডিফল্ট কি (process.env.GEMINI_API_KEY) ব্যবহার হবে
    const customApiKey = req.headers["x-api-key"] || process.env.GEMINI_API_KEY;

    if (!customApiKey) {
      return res.status(400).json({ error: "API Key missing!" });
    }

    // প্রতিবার রিকোয়েস্ট আসার সময় ডাইনামিকালি ক্লায়েন্ট তৈরি হবে
    const ai = new GoogleGenAI({ apiKey: customApiKey as string });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: image // আপনার বেস৬৪ ইমেজ ডেটা
          }
        },
        { text: "Extract UTR number and amount from this slip." } // আপনার আসল প্রম্পটটি এখানে রাখুন
      ]
    });

    res.json({ result: response.text });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});
