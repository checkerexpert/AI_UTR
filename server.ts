import express from 'express';

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));

async function tryGeminiScan(modelName: string, key: string, imgData: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: imgData } }
          ]
        }]
      })
    }
  );
  return await response.json();
}

app.post('/api/scan', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key missing on server");

    const imgData = req.body.image.split(',')[1];
    if (!imgData) throw new Error("Invalid image data");

    // প্রম্পটটিকে একদম স্পেসিফিক করা হলো যাতে ইমেজের সব টেক্সট সে আগে বের করে
    const prompt = 'Analyze this payment receipt image carefully. Read and extract all text content step-by-step, especially looking for Reference Numbers, Transaction IDs, UTR, and Indian Rupee Currency amounts. Return the raw text.';
    
    let result = await tryGeminiScan('gemini-2.5-flash', key, imgData, prompt);
    
    if (result.error) {
      result = await tryGeminiScan('gemini-1.5-pro', key, imgData, prompt);
    }

    if (result.error) {
      throw new Error(`Google API Error: ${result.error.message}`);
    }

    if (!result.candidates || !result.candidates[0]) {
      throw new Error("No response from Gemini models");
    }

    const rawText = result.candidates[0].content.parts[0].text;
    
    // --- ৫-স্টেপ ওয়াটারফল ফিল্টারিং লজিক ---
    let utr = "";
    let amount = "";

    // ১. UTR খোঁজার জন্য নিখুঁত রেগুলার এক্সপ্রেশন (১২ ডিজিটের সংখ্যা)
    const utrRegex = /(?:utr|ref|reference|txnid|transaction\s*id)[:\s\-#]*([0-9]{12})/i;
    const utrMatch = rawText.match(utrRegex);
    
    if (utrMatch && utrMatch[1]) {
      utr = utrMatch[1];
    } else {
      // ব্যাকআপ: যদি স্পেসিফিক ট্যাগ না থাকে, তবে ইমেজে থাকা যেকোনো ১২ ডিজিটের সংখ্যাকে UTR ধরবে
      const genericUtrMatch = rawText.match(/\b[0-9]{12}\b/);
      if (genericUtrMatch) utr = genericUtrMatch[0];
    }

    // ২. Amount খোঁজার লজিক (টাকা বা রুপি সাইন সহ সংখ্যা)
    const amountRegex = /(?:amount|amt|paid|total|₹|rs\.?)[:\s\-#]*([0-9,]+\.?[0-9]*)/i;
    const amountMatch = rawText.match(amountRegex);
    
    if (amountMatch && amountMatch[1]) {
      // কমা বা স্পেস থাকলে তা ক্লিন করে শুধু পিওর নাম্বার রাখা হচ্ছে
      amount = amountMatch[1].replace(/,/g, '').trim();
    }

    // যদি ফ্রন্টএন্ডে পাঠানোর জন্য JSON অবজেক্ট রেডি করি
    const responseData = {
      utr: utr || "NOT_FOUND",
      amount: amount || "NOT_FOUND"
    };

    res.json({ success: true, data: responseData });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
