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

async function tryGeminiScan(modelName: string, key: string, imgData: string, mimeType: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: imgData } }
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

    const rawImage = req.body.image;
    if (!rawImage) throw new Error("Invalid image data");

    let mimeType = "image/jpeg"; 
    if (rawImage.includes("data:")) {
      const mimeMatch = rawImage.match(/data:([^;]+);base64,/);
      if (mimeMatch) mimeType = mimeMatch[1];
    }

    const imgData = rawImage.split(',')[1] || rawImage;

    // জেমিনিকে একদম প্লেইন টেক্সট দিতে বাধ্য করার প্রম্পট
    const prompt = 'Analyze this receipt. Find the UTR/Reference number and the Total Amount. Write them clearly as UTR: value and AMOUNT: value. Do not write anything else.';
    
    let result = await tryGeminiScan('gemini-2.5-flash', key, imgData, mimeType, prompt);
    
    if (result.error) {
      result = await tryGeminiScan('gemini-1.5-pro', key, imgData, mimeType, prompt);
    }

    if (result.error) throw new Error(`Google API Error: ${result.error.message}`);
    if (!result.candidates || !result.candidates[0]) throw new Error("No response from Gemini");

    const text = result.candidates[0].content.parts[0].text || "";
    
    // --- ব্যাকএন্ডে হার্ডকোডেড রেগুলার এক্সপ্রেশন ফিল্টার ---
    let extractedUtr = "";
    let extractedAmount = "";

    // ১২ ডিজিটের যেকোনো সংখ্যাকে UTR হিসেবে খোঁজা
    const utrMatch = text.match(/\b\d{12}\b/);
    if (utrMatch) {
      extractedUtr = utrMatch[0];
    }

    // অ্যামাউন্ট ফিল্টার করার চেষ্টা
    const amountMatch = text.match(/(?:amount|amt|total|₹|rs)[:\s\-#]*([0-9,]+\.?[0-9]*)/i);
    if (amountMatch && amountMatch[1]) {
      extractedAmount = amountMatch[1].replace(/,/g, '').trim();
    }

    // যদি রেগুলার ফিল্টারে কিছু মিসও হয়, ব্যাকআপ হিসেবে পুরো টেক্সটটাই ফিল্ডে পুশ করে দেব যাতে '0' না দেখায়
    res.json({ 
      success: true, 
      data: {
        utr: extractedUtr || text.substring(0, 30).trim(), // ব্যাকআপ: টেক্সটের প্রথম অংশ
        amount: extractedAmount || "CHECK_RAW",
        rawText: text // ফ্রন্টএন্ডে সরাসরি প্রিন্ট করার জন্য
      } 
    });

  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
