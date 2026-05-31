import express from "express";
const app = express();
app.use(express.json({ limit: "15mb" }));

// ... (হেডার সেকশন আগের মতোই থাকবে)

app.post("/api/scan", async (req, res) => {
  try {
    const { image } = req.body;
    // ... (এপিআই কল লজিক আগের মতোই)

    const hfData: any = await hfResponse.json();
    const rawResult: string = hfData.extracted_text || "";

    // 🎯 স্মার্ট ফিল্টারিং লজিক (Contextual Analysis)
    const lines = rawResult.split(/\r?\n/);
    let foundUtr = "Not Found";
    let foundAmount = "0.00";

    lines.forEach(line => {
      const lowerLine = line.toLowerCase();

      // UTR এর জন্য: নির্দিষ্ট কী-ওয়ার্ডের পাশে থাকা ১২-২০ ডিজিট খুঁজবে
      if (lowerLine.includes("utr") || lowerLine.includes("ref") || lowerLine.includes("txn")) {
        const match = line.match(/\d{12,20}/);
        if (match) foundUtr = match[0];
      }

      // অ্যামাউন্টের জন্য: শুধুমাত্র সেই সংখ্যা যেখানে কারেন্সি সিম্বল বা টোটাল লেখা আছে
      if (lowerLine.includes("amount") || lowerLine.includes("total") || lowerLine.includes("rs")) {
        const match = line.match(/[\d,]+\.\d{2}/);
        if (match) foundAmount = match[0].replace(/,/g, '');
      }
    });

    // সব চেক শেষেও যদি কিছু না পায়, তবে একটা লাস্ট রিসোর্ট
    if (foundUtr === "Not Found") {
       const globalMatch = rawResult.match(/\b\d{12,20}\b/);
       if (globalMatch) foundUtr = globalMatch[0];
    }

    return res.json({
      status: "success",
      utr: foundUtr,
      amount: foundAmount,
      // ফ্রন্টএন্ডে ডিবাগ করার জন্য পুরো রেজাল্টও পাঠাচ্ছি
      debug_result: rawResult 
    });

  } catch (e) {
    res.status(500).json({ error: "Processing failed" });
  }
});
