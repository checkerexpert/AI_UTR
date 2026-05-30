import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import cors from "cors";

// Load environment variables
dotenv.config();

// Ensure Gemini API Key is present for the full-stack OCR
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. OCR processing will fail without a valid key.");
}

const ai = new GoogleGenAI({
  apiKey: apiKey || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
app.use(cors());
const PORT = 3000;

// Enable CORS for all origins to allow remote/public multi-device client requests
app.use(cors());

// Set higher limits for parsing base64 images and PDFs
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static assets from public folder if present
app.use(express.static(path.join(process.cwd(), "public")));

// API Route: Process receipt OCR using Gemini 3.5 Flash
app.post("/api/scan", async (req, res) => {
  try {
    const { image, mimeType, userId } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No payment slip file or image data provided." });
    }

    // Isolate the base64 content
    let cleanBase64 = image;
    let detectedMime = mimeType || "image/png";

    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      cleanBase64 = parts[1];
      // Try to extract mime type from data URL matches, e.g. "data:image/jpeg;base64,"
      const match = parts[0].match(/data:(.*?)$/);
      if (match) {
        detectedMime = match[1];
      }
    }

    console.log(`[OCR_SCAN] Scanning file of MIME type ${detectedMime} for UserID: "${userId}"`);

    // Analyze the document with Gemini 3.5 Flash
    const docPrompt = `
You are a highly precise OCR scanner for payment slips and payment transaction receipts.
Your task is to identify and extract EXACTLY:
1. The transaction reference number. It must be a 12 to 22 digit number. It is typically marked as UTR, UPI Ref, UPI Ref No, Ref No, Ref Number, UPI No, Transaction ID, IMPS Ref No, or Txn ID. Keep only numeric digits (strip spaces and non-numeric letters).
2. The transaction payment amount. Identify the numerical payment amount (e.g. Rs. 500, ₹500, Rs. 1,000, 500.00). Provide it as a clean number string (e.g., "500" or "1000", strip currency signs).

Please return these fields in the requested JSON structure.
If something cannot be detected, return empty strings. Let's do your best to scan carefully even with blurry, cropped screenshots, dark backgrounds, or busy receipts.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: detectedMime,
            data: cleanBase64,
          },
        },
        docPrompt
      ],
      config: {
        systemInstruction: "You are the primary engine of MAX OFFICIAL Payment verification. You specialize in scanning receipts with 100% accuracy from any banking or wallet UI (Paytm, PhonePe, GPay, IMPS, RTGS, QR codes, bank apps) and extracting the exact numerical amount and UTR reference ID.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            utr: {
              type: Type.STRING,
              description: "The 12-22 digit UTR number, Reference Number, UPI No, IMPS Ref No, or Transaction ID. Keep numeric digits."
            },
            amount: {
              type: Type.STRING,
              description: "The payment amount as a clean number or decimal string, without currency symbols or commas, e.g., '1500.00' or '500'."
            }
          },
          required: ["utr", "amount"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    const extractedUtr = (parsed.utr || "").replace(/[^0-9]/g, ""); // Ensure it contains only numeric digits as requested (12-22 digits)
    const extractedAmount = (parsed.amount || "").replace(/[^0-9.]/g, ""); // Clean formatting

    console.log(`[OCR_SCAN_SUCCESS] Extracted UTR: "${extractedUtr}", Amount: "${extractedAmount}"`);

    return res.json({
      success: true,
      utr: extractedUtr,
      amount: extractedAmount,
      userId: userId || "",
    });

  } catch (error: any) {
    console.error("[OCR_SCAN_ERROR] Failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during OCR scanning."
    });
  }
});

// Configure Vite middleware or statically serve the build
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[SERVER] Vite dev server middleware mounted.");
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[SERVER] Statically serving built frontend from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] MAX OFFICIAL Payment slip scanner online at port ${PORT}`);
  });
}

initializeServer();
