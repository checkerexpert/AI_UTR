import express from 'express';

const app = express();

// CORS ম্যানুয়াল হেডার (যা পারফেক্টলি কাজ করছে)
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

app.post('/api/scan', async (req, res) => {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("API Key missing on server");

    const imgData = req.body.image.split(',')[1];
    if (!imgData) throw new Error("Invalid image data");

    const prompt = 'Extract UTR and Amount. Return ONLY JSON like {"utr": "value", "amount": "value"}';

    // সরাসরি গুগলের অফিশিয়াল এন্ডপয়েন্টে রিকোয়েস্ট পাঠানো হচ্ছে
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imgData
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const result: any = await response.json();

    // গুগলের সরাসরি পাঠানো রেসপন্স থেকে টেক্সট বের করা
    if (result.error) {
      throw new Error(result.error.message || "Gemini API Error");
    }

    let text = result.candidates[0].content.parts[0].text;
    text = text.split('```json').join('').split('```').join('').trim();

    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
