import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  CheckCircle2,
  Copy,
  FileText,
  X,
  Laptop,
  Share2,
  AlertTriangle,
  Sparkles,
  Download,
  Check,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UploadedFile {
  name: string;
  mimeType: string;
  base64: string;
  size: string;
}

interface ScanResult {
  utr: string;
  amount: string;
  userId: string;
}

export default function App() {
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem("max_official_userid") || "";
  });
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Manual override fields to keep the system crash-proof
  const [isEditing, setIsEditing] = useState(false);
  const [manualUtr, setManualUtr] = useState("");
  const [manualAmount, setManualAmount] = useState("");

  // Clipboard copy state feedbacks
  const [sheetsCopied, setSheetsCopied] = useState(false);
  const [visualCopied, setVisualCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // PWA Registration Support
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect PWA status and listen to install prompts
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Sync User ID to local storage
  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserId(val);
    localStorage.setItem("max_official_userid", val);
  };

  // Convert File to Base64
  const processSelectedFile = (selectedFile: File) => {
    if (!selectedFile) return;

    setError(null);
    setResult(null);
    setIsEditing(false);

    const sizeInKB = (selectedFile.size / 1024).toFixed(1);
    const sizeStr = parseFloat(sizeInKB) > 1024 
      ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` 
      : `${sizeInKB} KB`;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result as string;
      setFile({
        name: selectedFile.name,
        mimeType: selectedFile.type,
        base64: base64Str,
        size: sizeStr,
      });
    };
    reader.onerror = () => {
      setError("Failed to read transaction slip asset. Please try again.");
    };
    reader.readAsDataURL(selectedFile);
  };

  // Drag and Drop Logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const triggerFileSelector = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setFile(null);
    setResult(null);
    setIsEditing(false);
    setError(null);
  };

  // Copy with horizontal tab separator: 'UTR\tUserID\tAmount
  const copySheetsFormatToClipboard = (utrVal: string, userIdVal: string, amountVal: string) => {
    const cleanUtr = utrVal.trim();
    const cleanUser = (userIdVal || "").trim();
    const cleanAmt = amountVal.trim();
    
    const sheetsString = `'${cleanUtr}\t${cleanUser}\t${cleanAmt}`;
    
    navigator.clipboard.writeText(sheetsString).then(() => {
      setSheetsCopied(true);
      setTimeout(() => setSheetsCopied(false), 2000);
    }).catch(err => {
      console.warn("Auto-copy blocked.", err);
    });
  };

  // Copy Visual Spacing
  const copyVisualFormatToClipboard = (utrVal: string, userIdVal: string, amountVal: string) => {
    const cleanUtr = utrVal.trim();
    const cleanUser = (userIdVal || "").trim();
    const cleanAmt = amountVal.trim();
    
    const visualString = `${cleanUtr} ${cleanUser} ${cleanAmt}`;
    
    navigator.clipboard.writeText(visualString).then(() => {
      setVisualCopied(true);
      setTimeout(() => setVisualCopied(false), 2000);
    });
  };

  // Action scanning process
  const handleDoneClick = async () => {
    if (!file) {
      setError("Please drop or choose a valid payment slip file to proceed.");
      return;
    }
    
    setIsScanning(true);
    setResult(null);
    setIsEditing(false);
    setError(null);

    try {
      const response = await fetch("https://ais-dev-aewmn6bbagjomoplwlu7uk-255711936994.europe-west2.run.app/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: file.base64,
          mimeType: file.mimeType,
          userId: userId.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const finalResult: ScanResult = {
          utr: data.utr || "N/A",
          amount: data.amount || "0",
          userId: userId.trim() || "N/A",
        };
        
        setResult(finalResult);
        setManualUtr(finalResult.utr);
        setManualAmount(finalResult.amount);

        // Immediate automatic copy triggers
        copySheetsFormatToClipboard(finalResult.utr, finalResult.userId, finalResult.amount);

      } else {
        throw new Error(data.error || "OCR Scan rejected parameters.");
      }
    } catch (err: any) {
      console.error("Scanning failed:", err);
      setError(
        err.message || 
        "Transaction scanning failed. Verify the slip structure or customize extraction details below."
      );
    } finally {
      setIsScanning(false);
    }
  };

  const saveManualEdits = () => {
    if (!result) return;
    const updated = {
      ...result,
      utr: manualUtr.replace(/[^0-9]/g, ""),
      amount: manualAmount.replace(/[^0-9.]/g, ""),
      userId: userId.trim() || "N/A",
    };
    setResult(updated);
    setIsEditing(false);
    copySheetsFormatToClipboard(updated.utr, updated.userId, updated.amount);
  };

  const installPwaApp = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      });
    }
  };

  const copyShareLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#000000] text-gray-200 flex flex-col justify-between items-center py-8 px-6 md:px-12 font-sans selection:bg-[#00FF00] selection:text-black">
      
      {/* Subtle Geometric Wireframe Grid background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[linear-gradient(rgba(0,255,0,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.012)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

      {/* HEADER SECTION - GEOMETRIC BALANCE DESIGN */}
      <header className="mb-8 w-full max-w-2xl relative z-10 text-center">
        <h1 className="text-center text-2xl md:text-3xl font-extrabold tracking-[0.3em] uppercase text-white select-none">
          MAX OFFICIAL
        </h1>
        <div className="h-px w-32 bg-white/20 mx-auto mt-2"></div>
        <div className="flex items-center justify-center gap-2 text-[9px] font-mono tracking-[0.18em] text-[#00FF00]/70 uppercase mt-3">
          <span className="w-1.5 h-1.5 bg-[#00FF00] rounded-full animate-ping"></span>
          HIGH-PRECISION WEB INTEGRATED OCR ENGINE
        </div>
      </header>

      {/* CORE CONTROL AREA */}
      <main className="w-full max-w-2xl flex flex-col gap-6 relative z-10">
        
        {/* CARD GRADIENT BODY CARRIES CONTROLS */}
        <div className="card-gradient rounded-2xl p-6 md:p-8 flex flex-col gap-6">
          
          {/* USER ID INPUT BOX (Geometric Balance Layout style) */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">
              System Access ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={userId}
                onChange={handleUserIdChange}
                placeholder="Enter User ID"
                className="w-full h-14 bg-[#111111] border border-[#3a3a3a] rounded-xl px-6 neon-text text-lg focus:outline-none focus:border-[#00FF00] placeholder-zinc-700 font-mono tracking-wide"
                id="user-id-input"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#00FF00]/40 tracking-wider">
                ACTIVE OPERATOR
              </span>
            </div>
          </div>

          {/* DRAG & DROP UPLOAD BOX (Geometric Balance Layout style) */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold ml-1">
              Upload Payment Slip Receipt
            </label>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelector}
              className={`upload-dash w-full min-h-[200px] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all p-6 text-center group ${
                isDragging ? "bg-zinc-900/80 border-[#00FF00]" : "hover:bg-zinc-900/40"
              }`}
              id="dropzone-box"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf"
                className="hidden"
              />

              <AnimatePresence mode="wait">
                {!file ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-12 h-12 mb-3 border-2 border-zinc-700 group-hover:border-[#00FF00] rounded-lg flex items-center justify-center transition-colors">
                      <UploadCloud className="w-6 h-6 text-zinc-500 group-hover:text-[#00FF00]" />
                    </div>
                    <p className="text-zinc-400 font-medium text-sm">
                      Upload Payment Slip
                    </p>
                    <p className="text-zinc-650 text-xs mt-1 font-mono tracking-wide text-zinc-600">
                      Supports JPG, PNG, PDF, Screenshots
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="loaded"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full space-y-4"
                  >
                    {file.mimeType.startsWith("image/") ? (
                      <div className="relative mx-auto max-h-[120px] max-w-[180px] rounded-lg overflow-hidden border border-[#3a3a3a] bg-black">
                        <img
                          src={file.base64}
                          alt="preview"
                          className="object-contain w-full h-full max-h-[120px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto w-10 h-10 border border-zinc-700 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[#00FF00]" />
                      </div>
                    )}

                    <div className="px-4">
                      <p className="font-mono text-xs text-white truncate max-w-[280px] mx-auto font-bold">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {file.size}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedFile();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-950/20 hover:bg-red-950/50 text-red-400 text-[10px] rounded border border-red-900/40 transition-colors uppercase font-mono tracking-wider"
                    >
                      <X className="w-2.5 h-2.5" /> Clear File
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* GLOSSY DONE BUTTON (Geometric Balance design standards) */}
          <button
            type="button"
            onClick={handleDoneClick}
            disabled={isScanning}
            className="glossy-btn w-full h-14 rounded-xl text-white font-bold text-lg uppercase tracking-[0.25em] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group font-display"
            id="done-verify-btn"
          >
            {isScanning ? (
              <span className="flex items-center gap-2 text-sm">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Scanning Verification Parameters...
              </span>
            ) : (
              <span className="flex items-center gap-2 font-black">
                <Sparkles className="w-5 h-5 text-[#00FF00] group-hover:scale-125 transition-transform" />
                DONE
              </span>
            )}
          </button>

          {/* DYNAMIC RESULTS FRAME */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-950/10 border border-red-900/40 rounded-xl p-4 flex gap-3 text-left"
              >
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-1">
                  <p className="font-bold text-red-400 uppercase tracking-widest font-mono">SCAN ALERT</p>
                  <p className="text-zinc-400">{error}</p>
                </div>
              </motion.div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 flex flex-col gap-2 text-left"
              >
                {/* Result Status labels */}
                <div className="flex justify-between items-end px-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
                    Live Extraction Result
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#00FF00]/70 flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 bg-[#00FF00] rounded-full animate-pulse"></span>
                    OCR Engine Active
                  </span>
                </div>

                {/* THE HIGH-PRECISION BLACK NEON OUTPUT DISPLAY */}
                <div
                  className="w-full bg-black border border-[#00ff00] rounded-xl p-6 flex flex-col items-center justify-center min-h-[100px] relative hover:shadow-[0_0_15px_rgba(0,255,0,0.25)] transition-shadow duration-300"
                  id="result-display-box"
                >
                  <div className="flex items-center gap-4 w-full justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00FF00] animate-ping shrink-0"></div>
                    <p className="neon-text mono text-lg md:text-2xl tracking-tight select-all text-center break-all font-bold">
                      {result.utr} {result.userId} {result.amount}
                    </p>
                  </div>
                  
                  <p className="text-[9px] text-[#00FF00]/80 font-mono mt-4 uppercase tracking-[0.2em] text-center">
                    {sheetsCopied || visualCopied ? "✓ Updated Clipboard buffer successfully" : "Auto-copied to clipboard for Google Sheets"}
                  </p>
                </div>

                {/* ADVANCED MULTI-COPY UTILITY RAIL */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => copySheetsFormatToClipboard(result.utr, result.userId, result.amount)}
                    className="cursor-pointer bg-[#111] hover:bg-[#1a1a1a] border border-[#3a3a3a] hover:border-[#00FF00] px-3 py-3 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-mono font-medium transition-all text-zinc-300 text-center uppercase tracking-wider"
                  >
                    {sheetsCopied ? (
                      <span className="text-[#00FF00] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Sheets Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Tab Copy
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => copyVisualFormatToClipboard(result.utr, result.userId, result.amount)}
                    className="cursor-pointer bg-[#111] hover:bg-[#1a1a1a] border border-[#3a3a3a] hover:border-[#00FF00] px-3 py-3 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-mono font-medium transition-all text-zinc-300 text-center uppercase tracking-wider"
                  >
                    {visualCopied ? (
                      <span className="text-[#00FF00] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Copied Visual
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3.5 h-3.5" /> Visual Copy
                      </span>
                    )}
                  </button>
                </div>

                {/* MANUAL AMENDMENT & STABILITY SYSTEM OVERRIDES */}
                <div className="border border-[#2d2d2d] bg-[#0c0c0c] rounded-xl p-4 mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                      SYSTEM CORRECTIONS
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-[10px] text-[#00FF00] hover:underline font-mono uppercase tracking-widest flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> {isEditing ? "Exit Override" : "Force Edit"}
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                            Correct UTR Number
                          </label>
                          <input
                            type="text"
                            value={manualUtr}
                            onChange={(e) => setManualUtr(e.target.value)}
                            className="w-full bg-black text-[#00FF00] font-mono text-xs py-2 px-3 border border-[#3a3a3a] rounded focus:border-[#00FF00] outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] font-mono text-zinc-500 uppercase tracking-wider">
                            Correct Amount
                          </label>
                          <input
                            type="text"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            className="w-full bg-black text-[#00FF00] font-mono text-xs py-2 px-3 border border-[#3a3a3a] rounded focus:border-[#00FF00] outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={saveManualEdits}
                        className="w-full text-center bg-zinc-900 hover:bg-zinc-805 hover:border-[#00FF00] border border-zinc-700 font-mono text-[10px] text-zinc-200 font-bold py-2 rounded uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Apply Edits &amp; Re-Copy
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-zinc-500 font-mono">
                      <span>UTR: <strong className="text-zinc-300">{result.utr || "N/A"}</strong></span>
                      <span>Assigned ID: <strong className="text-zinc-300">{result.userId || "N/A"}</strong></span>
                      <span>Extracted Amount: <strong className="text-[#00FF00]">{result.amount || "0"}</strong></span>
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* MULTI-DEVICE SUITE (PUBLIC LINKS & PC PLATFORM SUPPORT) */}
        <section className="card-gradient rounded-2xl p-6 flex flex-col gap-4 text-left">
          
          <h3 className="text-[11px] font-mono font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-2 flex items-center justify-between">
            <span>Device Compatibility Matrix</span>
            <span className="text-[8px] font-mono text-[#00FF00] bg-[#00FF00]/10 px-2 py-0.5 border border-[#00FF00]/30 rounded uppercase tracking-widest">
              WEB PORTAL &amp; PC APP
            </span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            
            {/* Desktop / PC Widget */}
            <div className="space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider font-mono">
                  <Laptop className="w-4 h-4 text-[#00FF00]" />
                  <span>Desktop App Client</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                  Run as an accelerated, low-latency independent desktop app native on your desktop workspace, ideal for bulk operations.
                </p>
              </div>

              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={installPwaApp}
                  className="cursor-pointer inline-flex items-center gap-1.5 w-full justify-center text-[10px] font-mono font-bold py-2 bg-[#00FF00] text-black rounded hover:bg-emerald-400 transition-colors uppercase tracking-wider mt-2"
                >
                  <Download className="w-3.5 h-3.5" /> Install Offline App
                </button>
              ) : isInstalled ? (
                <div className="w-full bg-zinc-900 text-[#00FF00] text-center text-[9px] font-mono py-2 rounded border border-zinc-800 uppercase tracking-wider mt-2">
                  ✓ PC Native standalone active
                </div>
              ) : (
                <div className="w-full bg-[#111] text-zinc-600 text-center text-[9px] font-mono py-2 rounded-lg border border-zinc-900 uppercase tracking-wider mt-2">
                  Driver standalone prompt standby
                </div>
              )}
            </div>

            {/* Direct Web sharing Widget */}
            <div className="space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider font-mono">
                  <Share2 className="w-4 h-4 text-[#00FF00]" />
                  <span>Public Browser Access</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                  Instantly open or share standard link over smartphones, tablets or workstations to verified team members.
                </p>
              </div>

              <button
                type="button"
                onClick={copyShareLink}
                className="cursor-pointer inline-flex items-center gap-1.5 w-full justify-center text-[10px] font-mono font-bold py-2 bg-black hover:bg-zinc-900 text-zinc-300 border border-[#3a3a3a] hover:border-[#00FF00] rounded hover:text-white transition-all uppercase tracking-wider mt-2"
              >
                {shareCopied ? (
                  <span className="flex items-center gap-1 text-[#00FF00]">
                    <Check className="w-3.5 h-3.5" /> Portal Link Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5" /> Copy Public Web Link
                  </span>
                )}
              </button>
            </div>

          </div>

        </section>

      </main>

      {/* FOOTER METADATA - "Geometric Balance" spec styling */}
      <footer className="mt-8 flex gap-4 md:gap-8 text-[10px] text-zinc-600 uppercase tracking-[0.2em] border-t border-zinc-900 pt-6 w-full max-w-4xl justify-center flex-wrap">
        <span>Web Interface v4.2.0</span>
        <span>PC Desktop Ready</span>
        <span>Public Link Enabled</span>
        <span>Encrypted Scan</span>
      </footer>

    </div>
  );
}
