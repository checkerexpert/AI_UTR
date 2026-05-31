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

    // জেমিনিকে ইমেজের ভেতরের সব লেখা হুবহু বের করতে বাধ্য করার প্রম্পট
    const prompt = 'Perform OCR on this image. Read every single word, number, and character from top to bottom. Output the complete extracted text exactly as it appears in the image.';
    
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

    const rawText = result.candidates[0].content.parts[0].text || "";
    
    // --- ডেটা খোঁজার রেগুলার এক্সপ্রেশন (Regex) ---
    let utr = "";
    let amount = "";

    // ১২ ডিজিটের ইউটিআর খোঁজার জন্য প্যাটার্ন (কোনো স্পেস ছাড়া বা ড্যাশ সহ)
    const utrMatch = rawText.match(/\b\d{12}\b/) || rawText.match(/(?:utr|ref|reference|txn|trans)[:\s\-#]*(\d+)/i);
    if (utrMatch) {
      utr = utrMatch[1] || utrMatch[0];
    }

    // অ্যামাউন্ট খোঁজার জন্য প্যাটার্ন (টাকা বা রুপির সংখ্যা)
    const amountMatch = rawText.match(/(?:amount|amt|paid|total|₹|rs\.?)[:\s\-#]*([0-9,]+\.?[0-9]*)/i);
    if (amountMatch && amountMatch[1]) {
      amount = amountMatch[1].replace(/,/g, '').trim();
    }

    // যদি ইউটিআর এবং অ্যামাউন্ট মেইন ফিল্টারে না পাওয়া যায়, তবে আমরা ফ্রন্টএন্ডে rawText সহ পাঠাবো
    const responseData = {
      utr: utr || "NOT_FOUND",
      amount: amount || "NOT_FOUND",
      debugRawText: rawText // ফ্রন্টএন্ডে পুরো টেক্সটটা দেখার জন্য ব্যাকআপ
    };

    res.json({ success: true, data: responseData });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
