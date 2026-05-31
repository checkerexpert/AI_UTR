import express from 'express';

const app = express();

// CORS ম্যানুয়াল হেডার (যা অলরেডি সাকসেসফুলি কানেক্ট হচ্ছে)
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

    // আমরা এখানে v1beta থেকে v1 এ শিফট করলাম এবং মডেলটি 'gemini-1.5-flash' রাখলাম যা v1 ইউআরএল-এ সাপোর্ট করে
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${key}`,
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

    // গুগলের পাঠানো এরর ডিবাগ করার জন্য
    if (result.error) {
      throw new Error(`Google API Error: ${result.error.message}`);
    }

    if (!result.candidates || !result.candidates[0]) {
      throw new Error("No response from Gemini models");
    }

    let text = result.candidates[0].content.parts[0].text;
    text = text.split('```json').join('').split('```').join('').trim();

    res.json({ success: true, data: JSON.parse(text) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(Number(process.env.PORT) || 3000);
