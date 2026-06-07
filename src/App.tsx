import React, { useState, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import { UserAccount, Message, Transaction } from "./types";
import { INITIAL_USER_ACCOUNT, PRESET_MESSAGES } from "./data";
import { InteractiveCards } from "./components/InteractiveCards";
import { WalletInfoDrawer } from "./components/WalletInfoDrawer";
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  CheckCheck,
  Search,
  MoreVertical,
  Phone,
  Video,
  Menu,
  ArrowRight,
  Shield,
  HelpCircle,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Sliders,
  Database,
  Lock,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  ExternalLink,
} from "lucide-react";

export default function App() {
  // Application view mode toggle: 'website' (marketing core) or 'demo' (interactive chat terminal)
  const [viewMode, setViewMode] = useState<'website' | 'demo'>('website');

  // Application State
  const [account, setAccount] = useState<UserAccount>(INITIAL_USER_ACCOUNT);
  const [messages, setMessages] = useState<Message[]>(PRESET_MESSAGES(INITIAL_USER_ACCOUNT.name));
  const [inputText, setInputText] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  // Marketing page specific interactivity states
  const [linkedNumber, setLinkedNumber] = useState("");
  const [linkedSuccess, setLinkedSuccess] = useState(false);

  // Fluctuating rates state
  const [rates, setRates] = useState({
    USDT: 1550,
    BTC: 151900000,
    ETH: 5347500,
    feePercent: 0.5,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll rates dynamically from backend
  const fetchRates = async () => {
    try {
      const response = await fetch("/api/rates");
      if (response.ok) {
        const data = await response.json();
        setRates(data);
      }
    } catch (err) {
      console.log("Using local simulated fluctuating exchange rates fallback.");
      // Micro-fluctuate locally if backend rate returns error
      const fluctuation = (val: number) => Math.round(val + (Math.random() - 0.5) * (val * 0.005));
      setRates((prev) => ({
        ...prev,
        USDT: fluctuation(prev.USDT),
        BTC: fluctuation(prev.BTC),
        ETH: fluctuation(prev.ETH),
      }));
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 15000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on updates inside demo view
  useEffect(() => {
    if (viewMode === "demo") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, viewMode]);

  // Voice recording timer simulated effect
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Handle Link Number Simulation on website
  const handleLinkNumber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedNumber.trim()) return;
    setLinkedSuccess(true);
    // Automatically configure phone number inside simulated state
    setAccount((prev) => ({
      ...prev,
      phone: linkedNumber,
    }));
    // Auto launch demo after brief gorgeous confirmation
    setTimeout(() => {
      setViewMode("demo");
    }, 1200);
  };

  // Handle Send Text Message in Demo Chat
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!textToSend) setInputText("");

    const userMsg: Message = {
      id: "usr_" + Math.random().toString(36).substr(2, 9),
      sender: "user",
      type: "text",
      text: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages,
          account: account,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        parseBotReply(data.reply);
      } else {
        throw new Error("API fail");
      }
    } catch (err) {
      // Offline / Key-less / Vercel static local fallback router
      setTimeout(() => {
        let replyText = "";
        const lower = text.toLowerCase();

        if (lower.includes("balance") || lower.includes("bal") || (lower.includes("money") && lower.includes("how much"))) {
          replyText = `📊 *FastXpend Active Web Wallet Balances*
          
• *Naira (NGN):* ₦${account?.balances?.NGN?.toLocaleString()}
• *USDT:* $${account?.balances?.USDT?.toLocaleString()}
• *Bitcoin (BTC):* ₿${account?.balances?.BTC}
• *Ethereum (ETH):* Ξ${account?.balances?.ETH}

_Verified Daily Transact Limit: ₦${account?.kycStatus === "verified" ? "5,000,000" : "50,000"}_

Would you like to *convert crypto* or *withdraw money* to your bank? Let me know!`;
        } else if (lower.includes("convert") || lower.includes("swap") || lower.includes("rate") || lower.includes("buy")) {
          replyText = `💱 *FastXpend Crypto Conversion Assistant*
          
Enter cryptocurrency type and amount you'd like to convert to NGN.
_Current rates:_
• *USDT:* ₦${rates.USDT.toLocaleString()}
• *BTC:* ₦${rates.BTC.toLocaleString()}
• *ETH:* ₦${rates.ETH.toLocaleString()}

Click below to complete conversion with zero hassle:
[TRIGGER:CONVERT]`;
        } else if (lower.includes("withdraw") || lower.includes("bank") || lower.includes("cashout")) {
          replyText = `🏦 *FastXpend Bank Withdrawal Portal*
          
Withdraw your Naira wallet funds directly to any Nigerian Bank instantly.
• *Current Naira Balance:* ₦${account?.balances?.NGN?.toLocaleString()}
• *Processing Fee:* ₦100 fixed flat rate

Fill in your details here:
[TRIGGER:WITHDRAW]`;
        } else if (lower.includes("bill") || lower.includes("airtime") || lower.includes("electricity") || lower.includes("utility") || lower.includes("data")) {
          replyText = `⚡ *FastXpend Bill & Telecom Payments*
          
You can easily top-up airtime, buy data, or recharge electricity from your ₦ balance:
• *Naira Wallet Balance:* ₦${account?.balances?.NGN?.toLocaleString()}

Choose utility service category:
[TRIGGER:BILL]`;
        } else if (lower.includes("kyc") || lower.includes("verify") || lower.includes("limit") || lower.includes("identity")) {
          replyText = `🛡️ *Security & KYC Verification*
          
Verify your ID to increase your daily transactional limit from *₦50,000* to *₦5,000,000*.
• *Your current KYC Status:* ${account?.kycStatus?.toUpperCase()}

Provide your document details:
[TRIGGER:KYC]`;
        } else if (lower.includes("deposit") || lower.includes("wallet") || lower.includes("address")) {
          replyText = `🔑 *Your FastXpend Cryptocurrency Deposit Wallets*

To credit your FastXpend crypto account, send compatible tokens to these addresses:
• *USDT (TRC20):* \`${account?.addresses?.USDT}\`
• *BTC:* \`${account?.addresses?.BTC}\`
• *ETH (ERC20):* \`${account?.addresses?.ETH}\`

_Deposits will credit your balance instantly after blockchain confirmations._
[TRIGGER:DEPOSIT]`;
        } else {
          replyText = `👋 Hello ${account?.name || "User"}! Welcome to *FastXpend* - Your 24/7 autonomous WhatsApp Crypto Transaction engine. 🚀

What transaction would you like to process with us today?
1. *Check balance* - View wallets & values
2. *Convert crypto* - Swap BTC/USDT/ETH to Naira ₦ [TRIGGER:CONVERT]
3. *Withdraw to bank* - Direct bank payout [TRIGGER:WITHDRAW]
4. *Pay utility bills* - Telecom, electricity [TRIGGER:BILL]
5. *Deposit Crypto* - Get addresses [TRIGGER:DEPOSIT]
6. *KYC Verification* - Authenticate [TRIGGER:KYC]

_Simply type a command or select an option from the menu list!_`;
        }

        parseBotReply(replyText);
      }, 600);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper: Inject Bot Messages & Optional Interactive cards
  const addBotMessage = (text: string, cardType?: any, cardData?: any) => {
    const botMsg: Message = {
      id: "bot_" + Math.random().toString(36).substr(2, 9),
      sender: "bot",
      type: cardType ? "card" : "text",
      text: text,
      timestamp: new Date().toISOString(),
      cardType,
      cardData,
    };
    setMessages((prev) => [...prev, botMsg]);
  };

  // Sub-parser to detect TRIGGER strings from LLM text and render interactive buttons
  const parseBotReply = (reply: string) => {
    let text = reply;
    let cardType: any = null;

    if (text.includes("[TRIGGER:CONVERT]")) {
      text = text.replace("[TRIGGER:CONVERT]", "").trim();
      cardType = "rate_convert";
    } else if (text.includes("[TRIGGER:WITHDRAW]")) {
      text = text.replace("[TRIGGER:WITHDRAW]", "").trim();
      cardType = "bank_withdraw";
    } else if (text.includes("[TRIGGER:BILL]")) {
      text = text.replace("[TRIGGER:BILL]", "").trim();
      cardType = "bill_payment";
    } else if (text.includes("[TRIGGER:KYC]")) {
      text = text.replace("[TRIGGER:KYC]", "").trim();
      cardType = "kyc_setup";
    } else if (text.includes("[TRIGGER:DEPOSIT]")) {
      text = text.replace("[TRIGGER:DEPOSIT]", "").trim();
      cardType = "wallet_info";
    } else if (text.includes("[TRIGGER:MENU]")) {
      text = text.replace("[TRIGGER:MENU]", "").trim();
    }

    addBotMessage(text, cardType);
  };

  // Simulate Voice Command recording in Demo
  const handleToggleVoiceRecord = () => {
    if (isRecording) {
      // Finish recording and send simulated voice note
      setIsRecording(false);
      const voiceDur = recordingSeconds;

      const userVoiceMsg: Message = {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        sender: "user",
        type: "voice",
        text: "🎤 Voice Note (" + voiceDur + "s)",
        voiceDuration: voiceDur,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userVoiceMsg]);
      setIsTyping(true);

      // Trigger server voice processing simulation
      setTimeout(async () => {
        try {
          const resp = await fetch("/api/voice-command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audioBase64: "mock_data", // simulate base64 input
              mimeType: "audio/webm",
            }),
          });

          if (resp.ok) {
            const result = await resp.json();
            const trans = result.transcript;
            addBotMessage(`🎙️ *Voice Note Extracted Transcript:*\n_"${trans}"_`);

            setIsTyping(true);
            setTimeout(() => {
              if (result.intent === "withdraw_bank") {
                addBotMessage(
                  `🏦 *Simulated Payout Agent:* Identified ₦${result.amount?.toLocaleString()} direct bank withdrawal request from your audio command.`,
                  "bank_withdraw",
                  { amount: result.amount }
                );
              } else if (result.intent === "convert_crypto") {
                addBotMessage(
                  `💱 *Crypto Swap Agent:* Detected *${result.amount} ${result.currency}* conversion task inside voice command. Please review current Naira values:`,
                  "rate_convert",
                  { currency: result.currency, amount: result.amount }
                );
              } else if (result.intent === "pay_bill") {
                addBotMessage(
                  `⚡ *Utility Agent:* Triggering bill checkout panel from voice context for ₦${result.amount?.toLocaleString()}:`,
                  "bill_payment",
                  { amount: result.amount }
                );
              } else if (result.intent === "check_balance") {
                handleSendMessage("balance");
              } else {
                addBotMessage("❓ Voice command transcribed, but could not finalize intent template. Type *Menu* to see the active options list.");
              }
              setIsTyping(false);
            }, 800);
          }
        } catch (err) {
          // Voice local sandbox fallback simulation to make voice notes work flawlessly on Vercel
          const mockVoiceScenarios = [
            {
              transcript: "Withdraw 15,000 Naira to my bank account",
              intent: "withdraw_bank",
              amount: 15000,
            },
            {
              transcript: "Convert 250 USDT to Nigerian Naira",
              intent: "convert_crypto",
              currency: "USDT",
              amount: 250,
            },
            {
              transcript: "Pay my utility electricity bill 5000 NGN",
              intent: "pay_bill",
              amount: 5000,
            },
            {
              transcript: "Show me my current wallet balances and active limits",
              intent: "check_balance",
            }
          ];

          // Pick a random mock voice note scenario so it feels incredibly alive on Vercel
          const mockScenario = mockVoiceScenarios[Math.floor(Math.random() * mockVoiceScenarios.length)];

          addBotMessage(`🎙️ *Voice Note Extracted Transcript (Local Simulation Sandbox):*\n_"${mockScenario.transcript}"_`);
          
          setIsTyping(true);
          setTimeout(() => {
            if (mockScenario.intent === "withdraw_bank") {
              addBotMessage(
                `🏦 *Simulated Payout Agent:* Identified ₦${mockScenario.amount?.toLocaleString()} direct bank withdrawal request from your audio command.`,
                "bank_withdraw",
                { amount: mockScenario.amount }
              );
            } else if (mockScenario.intent === "convert_crypto") {
              addBotMessage(
                `💱 *Crypto Swap Agent:* Detected *${mockScenario.amount} ${mockScenario?.currency}* conversion task inside voice command. Please review current Naira values:`,
                "rate_convert",
                { currency: mockScenario.currency, amount: mockScenario.amount }
              );
            } else if (mockScenario.intent === "pay_bill") {
              addBotMessage(
                `⚡ *Utility Agent:* Triggering bill checkout panel from voice context for ₦${mockScenario.amount?.toLocaleString()}:`,
                "bill_payment",
                { amount: mockScenario.amount }
              );
            } else if (mockScenario.intent === "check_balance") {
              // Trigger local balances display message directly
              addBotMessage(`📊 *FastXpend Active Web Wallet Balances*
          
• *Naira (NGN):* ₦${account?.balances?.NGN?.toLocaleString()}
• *USDT:* $${account?.balances?.USDT?.toLocaleString()}
• *Bitcoin (BTC):* ₿${account?.balances?.BTC}
• *Ethereum (ETH):* Ξ${account?.balances?.ETH}

_Verified Daily Transact Limit: ₦${account?.kycStatus === "verified" ? "5,000,000" : "50,000"}_

Would you like to *convert crypto* or *withdraw money* to your bank? Let me know!`);
            }
            setIsTyping(false);
          }, 800);
        } finally {
          setIsTyping(false);
        }
      }, 1000);
    } else {
      setIsRecording(true);
    }
  };

  // Drag and Drop files handlers (Usability - File upload flexibility)
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processScreenshotFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processScreenshotFile(e.target.files[0]);
    }
  };

  // Snap & Pay: Process uploaded screenshot file (Vision OCR)
  const processScreenshotFile = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Str = reader.result as string;

      const imageMsg: Message = {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        sender: "user",
        type: "image",
        text: `📸 Attached photo: ${file.name}`,
        mediaUrl: base64Str,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, imageMsg]);
      setIsTyping(true);

      try {
        const resp = await fetch("/api/snap-pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64Str }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const r = data.result;

          setTimeout(() => {
            addBotMessage(
              `📸 *Snap & Pay AI Screenshot Reader*\n\n• *Doc Recognized:* ${r.detectedDocType}\n• *Extracted Amount:* ₦${r.extractedAmount?.toLocaleString()}\n• *Matched Recipient:* ${r.recipientName}\n• *Category:* ${r.reason}\n• *Summary:* _"${r.descriptionSummary}"_\n\nAuthorize instant payout below by keying in your Transaction PIN:`,
              "bank_withdraw",
              { amount: r.extractedAmount }
            );
          }, 1200);
        }
      } catch (err) {
        // Fallback simulated OCR scanner for offline / keyless / Vercel modes
        setTimeout(() => {
          const mockOcrResult = {
            detectedDocType: "Direct Utility E-Invoice Receipt",
            extractedAmount: 18500,
            recipientName: "IKEDC (Ikeja Electricity Distribution)",
            reason: "utility_bill",
            descriptionSummary: "Voucher for prepaid household electricity token top-up clearance standard code."
          };

          addBotMessage(
            `📸 *Snap & Pay AI Screenshot Reader (Local Sandbox Mode)*\n\n• *Doc Recognized:* ${mockOcrResult.detectedDocType}\n• *Extracted Amount:* ₦${mockOcrResult.extractedAmount?.toLocaleString()}\n• *Matched Recipient:* ${mockOcrResult.recipientName}\n• *Category:* ${mockOcrResult.reason}\n• *Summary:* _"${mockOcrResult.descriptionSummary}"_\n\nAuthorize instant checkout bill below by keying in your Transaction PIN:`,
            "bill_payment",
            { amount: mockOcrResult.extractedAmount }
          );
        }, 1200);
      } finally {
        setIsTyping(false);
      }
    };
  };

  // View 1: Marketing Landing Website
  if (viewMode === 'website') {
    return (
      <div className="min-h-screen w-full bg-[#0F0F0F] text-[#F5F5F5] font-sans flex flex-col justify-between select-none overflow-x-hidden">
        {/* Header Navigation */}
        <nav className="flex justify-between items-center px-6 md:px-12 py-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tighter text-[#F5F5F5] font-sans">DIRECT.OS</span>
            <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 font-mono tracking-widest uppercase rounded-none select-none">
              v2.4.0
            </span>
          </div>
          
          <div className="flex gap-4 md:gap-10 text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            <a href="#about" className="hover:text-emerald-400 hover:opacity-100 transition-colors hidden sm:inline">Protocol</a>
            <a href="#rates" className="hover:text-emerald-400 hover:opacity-100 transition-colors hidden sm:inline">Live Index</a>
            <a href="#mechanics" className="hover:text-emerald-400 hover:opacity-100 transition-colors">How It Works</a>
            <button 
              onClick={() => setViewMode("demo")} 
              className="text-emerald-400 hover:text-white font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              LAUNCH DEMO <ExternalLink size={12} />
            </button>
          </div>
        </nav>

        {/* Live dynamic rate header bar to feel alive */}
        <div className="bg-[#161616] py-2 px-6 border-b border-white/5 flex gap-8 justify-center items-center overflow-x-auto whitespace-nowrap text-[10px] font-mono select-none">
          <span className="text-white/30 tracking-widest uppercase">FASTXPEND INDEX:</span>
          <span>USDT: <strong className="text-emerald-400">₦{rates.USDT?.toLocaleString()}</strong></span>
          <span className="opacity-30">|</span>
          <span>BTC: <strong className="text-emerald-400">₦{rates.BTC?.toLocaleString()}</strong></span>
          <span className="opacity-30">|</span>
          <span>ETH: <strong className="text-emerald-400">₦{rates.ETH?.toLocaleString()}</strong></span>
          <span className="opacity-30">|</span>
          <span className="text-emerald-500 animate-pulse flex items-center gap-1 uppercase tracking-widest">
            ● CLEARANCE RATE STABLE
          </span>
        </div>

        {/* Main Hero & Action Section */}
        <main className="flex-1 flex flex-col md:flex-row">
          {/* Left Column: Bold Editorial Typography Banner */}
          <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10">
            <div className="space-y-6 pt-4 md:pt-8">
              <span className="text-emerald-400 font-mono text-xs uppercase tracking-[0.3em] block">THE INTERACTIVE TRANSACTION PARADIGM</span>
              <h1 className="text-[52px] md:text-[85px] lg:text-[100px] leading-[0.9] font-light tracking-tight italic text-[#F5F5F5] font-display">
                Zero UI.<br />
                <span className="not-italic font-bold text-emerald-400">Pure Trade.</span>
              </h1>
              <p className="text-lg md:text-xl font-light text-white/50 max-w-lg leading-relaxed font-sans">
                Financial transactions distilled to a single chat thread. No dashboards. No heavy portals. No friction. Just performance via WhatsApp Business API infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-12 border-t border-white/10 mt-12">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-[#10b981] font-mono font-bold">Current System Status</span>
                <span className="text-sm font-mono text-slate-200">NETWORK_ACTIVE // 0.4ms latency</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-mono font-bold">24H Verified Volume</span>
                <span className="text-sm font-mono text-emerald-400">$4,285,190 USD equivalent</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Gateway Setup & Live Demo Launch */}
          <div className="w-full md:w-2/5 flex flex-col bg-[#161616] p-8 md:p-12 justify-center">
            <div className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-[#10b981] mb-2 font-mono">Gateway Protocol</h2>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <span className="text-emerald-400 font-mono text-sm border border-emerald-500/20 w-7 h-7 flex items-center justify-center shrink-0">01</span>
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest font-mono font-bold text-slate-200">Link Secure Number</h4>
                    <p className="text-xs text-white/50 mt-1">Bind your automated enterprise number to clear settlement lines.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="text-emerald-400 font-mono text-sm border border-emerald-500/20 w-7 h-7 flex items-center justify-center shrink-0">02</span>
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest font-mono font-bold text-slate-200">Auto-Process Intents</h4>
                    <p className="text-xs text-white/50 mt-1">Initiate conversions, pay utilities, and clear bank payouts dynamically inside the simulator.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <span className="text-emerald-400 font-mono text-sm border border-emerald-500/20 w-7 h-7 flex items-center justify-center shrink-0">03</span>
                  <div>
                    <h4 className="text-[11px] uppercase tracking-widest font-mono font-bold text-slate-200">AI OCR Recognition</h4>
                    <p className="text-xs text-white/50 mt-1">Upload screenshots of invoice receipts. Our Gemini model processes totals instantly in active thread.</p>
                  </div>
                </div>
              </div>

              {/* Number Registration Simulation Form */}
              <div className="pt-6 mt-6 border-t border-white/15">
                {linkedSuccess ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                    <CheckCircle2 size={20} className="text-emerald-400 mx-auto animate-bounce" />
                    <span className="text-[10px] uppercase font-mono tracking-widest font-bold text-emerald-400 block">PROTOCOL TUNNEL SECURED</span>
                    <p className="text-[9px] text-zinc-400 uppercase tracking-widest">REDIRECTING TO ACTIVE WEB DEMO...</p>
                  </div>
                ) : (
                  <form onSubmit={handleLinkNumber} className="space-y-3 font-mono">
                    <div>
                      <label className="text-[9px] text-[#10b981] font-bold uppercase tracking-widest block mb-1">Link WhatsApp Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. +234 812 345 6789"
                        value={linkedNumber}
                        onChange={(e) => setLinkedNumber(e.target.value)}
                        className="w-full bg-black border border-white/10 text-xs px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="group relative block w-full bg-emerald-500 text-black py-4 text-center text-xs font-bold uppercase tracking-widest hover:bg-white transition-all duration-300 cursor-pointer"
                    >
                      INITIALIZE LIVE DEMO
                      <span className="absolute right-4 group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Encryption Standard status flag */}
              <div className="flex items-center justify-between pt-6 border-t border-white/10 text-[9px] text-white/30 font-mono uppercase tracking-widest">
                <span>VOUCHER PARSING ENGINE</span>
                <span>AES-256-GCM / INTEGRAL_VISION</span>
              </div>
            </div>
          </div>
        </main>

        {/* Feature Bento Grid details */}
        <section id="mechanics" className="border-t border-white/10 px-6 md:px-12 py-16 bg-black">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-[#10b981] font-mono block">SYSTEM ARCHITECTURE</span>
              <h2 className="text-3xl md:text-4xl font-light italic font-display text-white">The Core Mechanics</h2>
              <p className="text-sm text-white/40 max-w-xl font-sans">
                Explore the underlying server-side structures powered by Gemini API vision modeling and CBN instant payout pipelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
              <div className="bg-[#161616] border border-white/10 p-6 space-y-4">
                <span className="w-10 h-10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">A</span>
                <h3 className="text-xs uppercase font-bold tracking-widest text-slate-100">Live OCR Screenshot Parsing</h3>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Drop files directly or tap the "Snap & Pay" shortcut. The model recognizes values, extracts the merchant names, and loads payment cards instantly inside the thread.
                </p>
              </div>

              <div className="bg-[#161616] border border-white/10 p-6 space-y-4">
                <span className="w-10 h-10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">B</span>
                <h3 className="text-xs uppercase font-bold tracking-widest text-slate-100">Simulated Audios</h3>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Unlocks command stream dispatch on natural speech. Press the microphone to stream recording, which transcribes intent patterns, like converting or checking rates.
                </p>
              </div>

              <div className="bg-[#161616] border border-white/10 p-6 space-y-4">
                <span className="w-10 h-10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">C</span>
                <h3 className="text-xs uppercase font-bold tracking-widest text-slate-100">Settlement Ledgers</h3>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  The drawer panel gives real-time access to transaction histories, daily metrics cleared, and total verified volume records.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Index Board Rates Board Detail */}
        <section id="rates" className="border-t border-white/10 px-6 md:px-12 py-16 bg-[#0F0F0F]">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-mono font-bold block">REAL-TIME FLUCTUATION BOARD</span>
              <h2 className="text-2xl md:text-3xl font-light italic font-display text-white">Naira Swap Indexes</h2>
            </div>

            <div className="bg-[#161616] border border-white/10 overflow-hidden font-mono uppercase text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-black text-white/40 text-[9px] tracking-wider">
                    <th className="py-3 px-4">ASSET CLASS</th>
                    <th className="py-3 px-4">SYS SYMBOL</th>
                    <th className="py-3 px-4 text-right">EXCHANGE INDEX</th>
                    <th className="py-4 px-4 text-right">CLEARING SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-slate-200">USDT Stablecoin</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">USDT_TRC20</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold text-right font-mono">₦{rates.USDT?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-[#10b981] font-bold text-right text-[10px] tracking-wide">IMMEDIATE // 90ms</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-slate-200">Bitcoin Core</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">BTC_NETWORK</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold text-right font-mono">₦{rates.BTC?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-right text-[10px] tracking-wide">IMMEDIATE // 90ms</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-slate-200">Ethereum Core</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">ETH_ERC20</td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold text-right font-mono">₦{rates.ETH?.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-right text-[10px] tracking-wide">IMMEDIATE // 90ms</td>
                  </tr>
                </tbody>
              </table>
              <div className="bg-black/40 text-[9px] text-zinc-500 py-2 text-center uppercase border-t border-white/5 tracking-wider font-mono">
                Rates automatically update every 15 seconds against global liquidity pools.
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 md:px-12 py-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] text-white/30 shrink-0">
          <div className="mb-4 md:mb-0">© 2026 DIRECT.OS ASSET clearing MANAGEMENT</div>
          <div className="flex gap-4 md:gap-8">
            <span className="hover:text-white transition-colors cursor-pointer">Protocol terms</span>
            <span className="hover:text-white transition-colors cursor-pointer">Security Standards</span>
            <span className="text-white/60">System Ready // Central Pool OK</span>
          </div>
        </footer>
      </div>
    );
  }

  // View 2: Live WhatsApp Simulator Demo interface
  return (
    <div className="flex h-screen w-screen bg-[#0F0F0F] overflow-hidden select-none text-slate-100 font-sans">
      
      {/* LEFT CHAT SELECTOR LIST SIDEBAR */}
      <div className="w-80 h-full bg-[#0F0F0F] border-r border-white/10 flex flex-col hidden md:flex">
        
        {/* User profile header spacer */}
        <div className="h-[60px] bg-[#161616] px-4 flex justify-between items-center text-slate-200 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-800 border border-white/10 rounded-none flex items-center justify-center font-bold text-xs font-mono">
              AM
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-wider font-semibold leading-none">{account.name}</h3>
              <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase">SIM_USER // CONTEXT</span>
            </div>
          </div>
          <div className="flex gap-2.5 items-center">
            <RefreshCw
              size={13}
              className="text-zinc-400 hover:text-emerald-400 cursor-pointer transition-colors"
              onClick={fetchRates}
            />
            <MoreVertical size={14} className="text-zinc-400" />
          </div>
        </div>

        {/* Home navigation portal for easy website return */}
        <div className="p-3 bg-black border-b border-white/10">
          <button
            onClick={() => setViewMode('website')}
            className="w-full bg-[#161616] border border-white/10 hover:border-[#10b981] text-[9.5px] uppercase font-mono py-2 text-center text-emerald-400 transition-all duration-300 block tracking-widest font-bold"
          >
            ← BACK TO SYSTEM MAIN
          </button>
        </div>

        {/* Search filter banner */}
        <div className="p-3 bg-[#0F0F0F] border-b border-white/10">
          <div className="flex items-center gap-2 bg-[#161616] px-3 py-1.5 border border-white/10 rounded-none text-zinc-400 text-xs font-mono">
            <Search size={13} />
            <input
              type="text"
              placeholder="SEARCH PROTOCOL..."
              className="bg-transparent focus:outline-none w-full placeholder-zinc-600 text-[10px] tracking-wider"
              disabled
            />
          </div>
        </div>

        {/* List of active channels */}
        <div className="flex-1 overflow-y-auto bg-[#0F0F0F]">
          {/* Active pinned business chat */}
          <div className="p-4 bg-[#161616] hover:bg-[#1a1a1a] flex justify-between cursor-pointer border-b border-white/10 transition-colors">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-[#1e1e1e] border-l-2 border-emerald-500 flex items-center justify-center text-white text-xs font-black relative font-mono">
                FX
                <span className="absolute bottom-0.5 right-0.5 w-2 h-2 bg-emerald-500 rounded-full"></span>
              </div>
              <div className="space-y-1 max-w-[150px]">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[11px] font-bold text-slate-100 uppercase tracking-widest font-sans">FastXpend Bot</h4>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 font-bold uppercase tracking-wider select-none">ACTIVE</span>
                </div>
                <p className="text-[10px] text-zinc-400 truncate">LAUNCH TRANSACTION GATEWAY</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">PROTOCOL</span>
              <span className="w-3.5 h-3.5 bg-emerald-500 text-black font-mono text-[9px] flex items-center justify-center font-bold">1</span>
            </div>
          </div>

          <div className="p-4 hover:bg-[#161616]/40 flex gap-3 border-b border-white/5 cursor-not-allowed opacity-30">
            <div className="w-10 h-10 bg-zinc-900 border border-white/10 flex items-center justify-center text-slate-300 text-[10px] font-mono">MD</div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wide">Dave (Ref)</h4>
              <p className="text-[10px] text-zinc-500 truncate">Settle the invoice via WhatsApp thread</p>
            </div>
          </div>

          <div className="p-4 hover:bg-[#161616]/40 flex gap-3 border-b border-white/5 cursor-not-allowed opacity-30">
            <div className="w-10 h-10 bg-zinc-900 border border-white/10 flex items-center justify-center text-slate-300 text-xs font-mono">₦</div>
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wide">Payout Channel</h4>
              <p className="text-[10px] text-zinc-500 truncate">Network clearance successfully established</p>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER MAIN INTERACTIVE WHATSAPP WEB CONTEXT */}
      <div
        className={`flex-grow flex flex-col h-full bg-[#0F0F0F] relative ${
          dragActive ? "border border-dashed border-emerald-500" : ""
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* WhatsApp chat window top navbar */}
        <div className="h-[60px] bg-[#161616] px-4 flex justify-between items-center border-b border-white/10 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Direct Back button on compact display mobile screens */}
            <button 
              onClick={() => setViewMode('website')} 
              className="p-1 px-2.5 bg-black hover:bg-emerald-500 hover:text-black border border-white/10 text-emerald-400 text-[9px] font-mono font-bold tracking-widest block md:hidden uppercase"
            >
              ← HOME
            </button>

            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            >
              <div className="w-9 h-9 bg-black border border-white/20 rounded-none flex items-center justify-center text-emerald-400 text-xs font-mono relative">
                FX
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-none"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs uppercase tracking-widest font-bold text-slate-100 font-sans">FastXpend Transaction API</h2>
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded-none font-bold uppercase tracking-wider select-none">Verified</span>
                </div>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">AUTO_RESPONSIVE // CLICK_INFO</p>
              </div>
            </div>
          </div>

          {/* Controls icons header */}
          <div className="flex items-center gap-4 text-zinc-400 font-mono">
            <button 
              onClick={() => setViewMode('website')} 
              className="hidden md:inline-block p-1 px-3 bg-black hover:bg-[#10b981] hover:text-black border border-white/10 rounded-none text-emerald-400 text-[9px] font-bold tracking-widest transition-all duration-300 uppercase"
            >
              ← Back to Main Home
            </button>
            <div className="hidden md:block w-px h-4 bg-white/10" />
            
            <Video size={14} className="cursor-not-allowed opacity-40" />
            <Phone size={13} className="cursor-not-allowed opacity-40" />
            <Search
              size={14}
              className="cursor-pointer hover:text-white transition-colors"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            />
            <Menu
              size={15}
              className="cursor-pointer hover:text-white transition-colors block md:hidden"
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            />
          </div>
        </div>

        {/* Drag Over Shield */}
        {dragActive && (
          <div className="absolute inset-0 bg-[#0F0F0F]/95 z-55 flex flex-col items-center justify-center gap-3 select-none pointer-events-none border border-emerald-500 animate-pulse">
            <Sparkles size={32} className="text-emerald-400" />
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-100 font-mono">Drop Screenshot Invoice Receipt here</h4>
            <p className="text-xs text-zinc-400 font-sans">AI Gemini extracts balances and loads Snap & Pay payload immediately.</p>
          </div>
        )}

        {/* WHATSAPP CHAT THREAD VIEW */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-[#0F0F0F]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col w-full max-w-[85%] md:max-w-[70%] ${
                msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div
                className={`p-4 rounded-none shadow-sm text-xs relative select-text leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-[#1c1c1c] text-slate-100 border-l border-emerald-500 border border-white/5"
                    : "bg-[#161616] text-slate-100 border border-white/10"
                }`}
              >
                {/* Image message */}
                {msg.type === "image" && msg.mediaUrl && (
                  <div className="mb-3 rounded-none overflow-hidden border border-white/10 shadow">
                    <img src={msg.mediaUrl} alt="Voucher screenshot" className="w-[280px] max-h-[300px] object-cover" />
                  </div>
                )}

                {/* Structured text body with basic markdown rules support */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text.split("\n").map((line, idx) => {
                    const boldRegex = /\*([^*]+)\*/g;
                    const parts = [];
                    let lastIdx = 0;
                    let match;
                    
                    while ((match = boldRegex.exec(line)) !== null) {
                      if (match.index > lastIdx) {
                        parts.push(line.substring(lastIdx, match.index));
                      }
                      parts.push(<strong key={match.index} className="text-emerald-400 font-extrabold">{match[1]}</strong>);
                      lastIdx = boldRegex.lastIndex;
                    }
                    if (lastIdx < line.length) {
                      parts.push(line.substring(lastIdx));
                    }

                    return (
                      <p key={idx} className={line.startsWith("•") || line.startsWith("-") ? "pl-2 mb-1 text-zinc-300 font-sans" : "mb-1.5 last:mb-0"}>
                        {parts.length > 0 ? parts : line}
                      </p>
                    );
                  })}
                </div>

                {/* Render interactive helper micro cards inline if type matches card */}
                {msg.type === "card" && msg.cardType && (
                  <InteractiveCards
                    cardType={msg.cardType}
                    cardData={msg.cardData}
                    account={account}
                    rates={rates}
                    onUpdateAccount={(upd) => setAccount(upd)}
                    onAddBotMessage={addBotMessage}
                  />
                )}

                {/* Timestamp line indicator mimics WhatsApp */}
                <div className="flex items-center justify-end gap-1.5 text-[8px] tracking-wider text-white/30 text-right mt-2 font-mono select-none uppercase">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {msg.sender === "user" && <CheckCheck size={11} className="text-emerald-400" />}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex mr-auto items-start max-w-[70%] select-none animate-pulse">
              <div className="bg-[#161616] text-[#F5F5F5] border border-white/10 p-4 rounded-none text-xs flex items-center gap-2 font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-none animate-bounce" style={{ animationDelay: "300ms" }}></span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400">FASTXPEND // CHECKING BLOCKCHAIN PROTOCOLS...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* HELPER COMMAND TRIGGER COMPACT BAR */}
        <div className="bg-[#161616] border-t border-white/10 p-2.5 px-4 flex flex-wrap gap-1.5 items-center select-none">
          <span className="text-[9px] tracking-widest text-zinc-500 font-bold uppercase mr-1.5 font-mono">Shortcuts //</span>
          
          <button
            onClick={() => handleSendMessage("Menu")}
            className="bg-black hover:bg-emerald-400 hover:text-black text-slate-100 text-[9px] font-mono tracking-widest uppercase py-1.5 px-3 border border-white/10 rounded-none transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>🤖</span> Menu list
          </button>
          <button
            onClick={() => handleSendMessage("Check balance")}
            className="bg-black hover:bg-emerald-400 hover:text-black text-slate-100 text-[9px] font-mono tracking-widest uppercase py-1.5 px-3 border border-white/10 rounded-none transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>💰</span> Balances
          </button>
          <button
            onClick={() => handleSendMessage("Convert crypto")}
            className="bg-black hover:bg-emerald-400 hover:text-black text-slate-100 text-[9px] font-mono tracking-widest uppercase py-1.5 px-3 border border-white/10 rounded-none transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>💱</span> Swap Crypto
          </button>
          <button
            onClick={() => handleSendMessage("Withdraw to bank")}
            className="bg-black hover:bg-emerald-400 hover:text-black text-slate-100 text-[9px] font-mono tracking-widest uppercase py-1.5 px-3 border border-white/10 rounded-none transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>🏦</span> Bank Withdrawal
          </button>
          <button
            onClick={() => handleSendMessage("Pay bills")}
            className="bg-black hover:bg-emerald-400 hover:text-black text-slate-100 text-[9px] font-mono tracking-widest uppercase py-1.5 px-3 border border-white/10 rounded-none transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚡</span> Pay utility bills
          </button>
          <button
            onClick={() => handleSendMessage("Deposit addresses")}
            className="bg-black hover:bg-emerald-400 hover:text-black text-slate-100 text-[9px] font-mono tracking-widest uppercase py-1.5 px-3 border border-white/10 rounded-none transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>🔑</span> Deposit Portals
          </button>
          <button
            onClick={() => handleSendMessage("KYC details")}
            className="bg-black hover:bg-emerald-400 hover:text-black text-slate-100 text-[9px] font-mono tracking-widest uppercase py-1.5 px-3 border border-white/10 rounded-none transition-all duration-300 flex items-center gap-1.5 cursor-pointer"
          >
            <span>🛡️</span> Upgrade Limit (KYC)
          </button>
        </div>

        {/* BOTTOM INPUT BAR */}
        <div className="h-[62px] bg-[#161616] px-4 flex items-center gap-3 border-t border-white/10">
          
          {/* Snap & Pay attachment file upload trigger (Manual selection click) */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer w-7 h-7"
              id="file-attachment-input-app"
            />
            <label
              htmlFor="file-attachment-input-app"
              title="Snap & Pay: Upload Screenshot invoice/receipt"
              className="p-2 text-zinc-400 hover:text-white cursor-pointer hover:bg-white/5 rounded-none block transition-colors border border-white/5 bg-black/40"
            >
              <Paperclip size={15} />
            </label>
          </div>

          {/* Preset trigger demo invoice screenshot button for quick experience */}
          <button
            title="Inject Mock Receipt Screenshot"
            className="p-2 bg-black border border-emerald-500/20 hover:border-emerald-500 transition-colors rounded-none flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-[#10b981] cursor-pointer"
            onClick={() => {
              processScreenshotFile(new File([new Blob()], "Naira_Prepaid_Invoice.png", { type: "image/png" }));
            }}
          >
            <ImageIcon size={13} /> <span className="hidden sm:inline font-bold">SNAP & PAY</span>
          </button>

          {/* Text Input area */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex-1 flex gap-2 h-10 items-center justify-between"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="TYPE TRANSACTION COMMAND..."
              className="flex-grow bg-black border border-white/10 focus:border-white/20 focus:outline-none px-4 rounded-none text-xs font-mono tracking-wider h-full placeholder-zinc-600 text-white"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 px-3.5 bg-zinc-900 border border-white/15 hover:bg-emerald-500 hover:text-black hover:border-emerald-500 disabled:bg-zinc-950 disabled:text-zinc-700 disabled:border-white/5 text-white rounded-none transition-all cursor-pointer h-full flex items-center justify-center shadow-none font-mono"
            >
              <Send size={13} />
            </button>
          </form>

          {/* Voice Command Button */}
          <div className="flex items-center gap-1">
            {isRecording ? (
              <div className="flex items-center gap-2 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-none text-[9px] uppercase tracking-wider text-red-400 font-mono">
                <span className="w-1.5 h-1.5 bg-red-500 voice-pulse"></span>
                <span>Voice Stream: {recordingSeconds}s</span>
                <button
                  onClick={handleToggleVoiceRecord}
                  title="Stop and process audio command"
                  className="bg-red-550 text-white hover:bg-red-400 p-1 rounded-none block ml-2 border-none cursor-pointer"
                >
                  <Send size={10} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleToggleVoiceRecord}
                title="Send voice note command e.g., 'withdraw 15k to John', 'convert 50usdt'"
                className="p-2.5 bg-zinc-900 border border-white/15 hover:bg-emerald-500 hover:text-black hover:border-emerald-500 text-white rounded-none transition-all flex items-center justify-center shadow-none cursor-pointer"
              >
                <Mic size={14} />
              </button>
            )}
          </div>
        </div>

      </div>

      {/* RIGHTDRAWER FOR BLOCKCHAIN INFO, SYSTEM METRICS & HISTORY */}
      <WalletInfoDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        account={account}
        rates={rates}
      />

    </div>
  );
}
