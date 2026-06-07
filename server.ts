import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure Gemini Client is initialized safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
  }
} else {
  console.log("No valid GEMINI_API_KEY found, running in Simulator Auto-Feedback Mode.");
}

// In-memory cache for dynamic rates
let cachedRates = {
  USDT: 1550,
  BTC: 151900000,
  ETH: 5347500,
  feePercent: 0.5,
  lastUpdated: new Date().toISOString(),
};

// Asynchronous background rate refresher from Coinbase Spot APIs
async function refreshRates() {
  try {
    // 1. Fetch BTC NGN spot rate
    const btcRes = await fetch("https://api.coinbase.com/v2/prices/BTC-NGN/spot");
    let btcPrice = cachedRates.BTC;
    if (btcRes.ok) {
      const btcJson: any = await btcRes.json();
      const val = parseFloat(btcJson?.data?.amount);
      if (val > 0) btcPrice = Math.round(val);
    }

    // 2. Fetch ETH NGN spot rate
    const ethRes = await fetch("https://api.coinbase.com/v2/prices/ETH-NGN/spot");
    let ethPrice = cachedRates.ETH;
    if (ethRes.ok) {
      const ethJson: any = await ethRes.json();
      const val = parseFloat(ethJson?.data?.amount);
      if (val > 0) ethPrice = Math.round(val);
    }

    // 3. Fetch USDT NGN spot rate
    const usdtRes = await fetch("https://api.coinbase.com/v2/prices/USDT-NGN/spot");
    let usdtPrice = cachedRates.USDT;
    if (usdtRes.ok) {
      const usdtJson: any = await usdtRes.json();
      const val = parseFloat(usdtJson?.data?.amount);
      if (val > 0) usdtPrice = Math.round(val);
    } else {
      // Fallback: USD-NGN exchange rate can represent parallel premium USDT-NGN
      const usdRes = await fetch("https://api.coinbase.com/v2/prices/USD-NGN/spot");
      if (usdRes.ok) {
        const usdJson: any = await usdRes.json();
        const val = parseFloat(usdJson?.data?.amount);
        if (val > 0) usdtPrice = Math.round(val);
      }
    }

    // Update global memory cache if prices look valid
    if (btcPrice && ethPrice && usdtPrice) {
      cachedRates = {
        USDT: usdtPrice,
        BTC: btcPrice,
        ETH: ethPrice,
        feePercent: 0.5,
        lastUpdated: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.warn("Could not retrieve live crypto rates from central API. Using cached real-world values:", error);
  }
}

// Initial seed and trigger background refreshes
refreshRates();
setInterval(refreshRates, 60000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Extend json limit to allow base64 image/voice upload
  app.use(express.json({ limit: "30mb" }));
  app.use(express.urlencoded({ limit: "30mb", extended: true }));

  // API: Get Real-time simulated fluctuating rates (always snappy, warm-cache backed)
  app.get("/api/rates", (req, res) => {
    // Non-blocking trigger to keep feed warm
    refreshRates().catch(() => {});

    // Add continuous micro tick-fluctuations so the charts feel completely active & alive
    const rand = () => (Math.random() - 0.5) * 5;
    const usdtNg = Math.round(cachedRates.USDT + rand());
    const btcNg = Math.round(cachedRates.BTC + rand() * 100);
    const ethNg = Math.round(cachedRates.ETH + rand() * 10);

    res.json({
      USDT: usdtNg,
      BTC: btcNg,
      ETH: ethNg,
      feePercent: cachedRates.feePercent,
      lastUpdated: cachedRates.lastUpdated,
    });
  });

  // API: Process WhatsApp Chat Message via Gemini (with full wallet contextual integration)
  app.post("/api/chat", async (req, res) => {
    const { message, history, account } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const systemPrompt = `
You are the official FastXpend WhatsApp Transaction Assistant (Verified Business Bot).
Your job is to assist users in managing their wallets, converting cryptocurrency (USDT, BTC, ETH) to Nigerian Naira (NGN), initiating bank withdrawals, making utility bill payments (Airtime, Electricity, Internet Data), depositing funds, and conducting transfers.

CRITICAL INFORMATION & DESIGN PRINCIPLES:
1. Address the user based on their active Profile: ${account?.name || "User"} (${account?.phone || "No Number"}).
2. Current dynamic live currency exchange rate indexes in Naira (NGN):
   - USDT (Tether): ₦${cachedRates.USDT.toLocaleString()} (per 1 USDT)
   - BTC (Bitcoin): ₦${cachedRates.BTC.toLocaleString()} (per 1 BTC)
   - ETH (Ethereum): ₦${cachedRates.ETH.toLocaleString()} (per 1 ETH)
3. Use standard WhatsApp visual formatting:
   - Use asterisks for bolding: *bold text*
   - Use underscores for italics: _italics_
   - Use lists for multiple options.
   - Use conversational emojis, but keep it structured like a high-grade finance bot.
4. Keep answers concise. Do not talk excessively. Remember this is a chat-based WhatsApp experience.
5. If the user wants to initiate an action, you can suggest clicking one of FastXpend's custom interactive menu structures or prompt them for missing information.
6. Your current simulation account states are:
   - Naira (NGN) Balance: ₦${account?.balances?.NGN?.toLocaleString() || "0"}
   - USDT Balance: $${account?.balances?.USDT?.toLocaleString() || "0"} (Address: ${account?.addresses?.USDT})
   - BTC Balance: ₿${account?.balances?.BTC || "0"} (Address: ${account?.addresses?.BTC})
   - ETH Balance: Ξ${account?.balances?.ETH || "0"} (Address: ${account?.addresses?.ETH})
   - KYC Verification Status: ${account?.kycStatus || "unverified"} (Limits: Unverified = ₦50,000 daily, Verified = ₦5,000,000 daily)
   - Transaction PIN status: ${account?.pinSet ? "SET" : "NOT SET (will prompt to register PIN)"}

COMMON COMMAND TRIGGERS & BOT RESPONSES:
- Balance check: Summarize wallet values inside a neat WhatsApp message with emojis.
- "Menu" or "Help": Present a numbered menu of core features to build:
  1. *Convert Crypto* (USDT, BTC, ETH to NGN ₦)
  2. *Withdraw to Bank* (Select bank, input account number, withdraw Naira ₦)
  3. *Pay Bills* (Buy Airtime, Internet Data, or Electricity)
  4. *Crypto Deposit* (Get wallet addresses & QR layouts)
  5. *Send Money* (Transfer funds instantly to another phone number)
  6. *KYC Verification* (Submit standard verification)
  7. *Snap & Pay* (Upload a payment receipt/QR screenshot directly)
  8. *Voice Transactions* (Press Mic to dictate commands)
- User asks for specific action (e.g., "withdraw 20000 naira", "convert 50 usdt", "buy airtime"):
  If they ask to convert, pay, or withdraw, recognize the values and return structured prompts.

Fallback / State Trigger Parsing:
If the user's intent is clear, you can trigger interactive UI cards by concluding your message with a system trigger metadata object.
Example keywords you can trigger if you notice the user wants to open an interactive card:
- Use [TRIGGER:CONVERT] to show the client-side Crypto Conversion card.
- Use [TRIGGER:WITHDRAW] to show the Bank Withdrawal card.
- Use [TRIGGER:BILL] to show the Bill Payments (Airtime/Utilities) card.
- Use [TRIGGER:KYC] to show the KYC Verification card.
- Use [TRIGGER:DEPOSIT] to show active cryptocurrency deposit addresses.

Respond directly and professionally. Keep the core focus on smooth WhatsApp transactability.
`;

    // Format conversation history for Gemini
    const contents = [];
    if (history && Array.isArray(history)) {
      // Add previous messages
      history.slice(-10).forEach((msg) => {
        contents.push({
          role: msg.sender === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }
    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
          },
        });

        const reply = response.text || "Sorry, I am having trouble processing your WhatsApp command. [TRIGGER:MENU]";
        return res.json({ reply });
      } catch (err: any) {
        console.error("Gemini API error inside chat route:", err);
        return res.status(200).json({
          reply: `⚠️ *[Service Note]* It looks like the Gemini backend had an issue processing this request directly, but I can assist you with FastXpend's direct triggers!
          
*Simulation Helper Prompt:*
How can I help you?
1. *Check balance* - View ₦ and crypto balances
2. *Convert crypto* - Swap tokens to Naira ₦ [TRIGGER:CONVERT]
3. *Withdraw to bank* - Send cash [TRIGGER:WITHDRAW]
4. *Pay utility bills* - Airtime/electricity [TRIGGER:BILL]
5. *Deposit Crypto* - Get wallets [TRIGGER:DEPOSIT]
6. *KYC Verification* - Authenticate [TRIGGER:KYC]`,
        });
      }
    } else {
      // Complete Local Simulation bot with intelligent rules matching FastXpend
      let replyText = "";
      const lower = message.toLowerCase();

      if (lower.includes("balance") || lower.includes("bal") || lower.includes("money") && lower.includes("how much")) {
        replyText = `📊 *FastXpend Active Web Wallet Balances*
        
• *Naira (NGN):* ₦${account?.balances?.NGN?.toLocaleString()}
• *USDT:* $${account?.balances?.USDT?.toLocaleString()}
• *Bitcoin (BTC):* ₿${account?.balances?.BTC}
• *Ethereum (ETH):* Ξ${account?.balances?.ETH}

_Verified Daily Transact Limit: ₦${account?.kycStatus === "verified" ? "5,000,000" : "50,000"}_

Would you like to *convert crypto* or *withdraw money* to your bank? Let me know!`;
      } else if (lower.includes("convert") || lower.includes("swap") || lower.includes("rate")) {
        replyText = `💱 *FastXpend Crypto Conversion Assistant*
        
Enter cryptocurrency type and amount you'd like to convert to NGN.
_Current rates:_
• *USDT:* ₦${cachedRates.USDT.toLocaleString()}
• *BTC:* ₦${cachedRates.BTC.toLocaleString()}
• *ETH:* ₦${cachedRates.ETH.toLocaleString()}

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
      } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey") || lower.includes("menu") || lower.includes("help") || lower.includes("fastxpend")) {
        replyText = `👋 Hello ${account?.name || "User"}! Welcome to *FastXpend* - Your 24/7 autonomous WhatsApp Crypto Transaction engine. 🚀

What transaction would you like to process with us today?
1. *Check balance* - View wallets & values
2. *Convert crypto* - Swap BTC/USDT/ETH to Naira ₦ [TRIGGER:CONVERT]
3. *Withdraw to bank* - Direct bank payout [TRIGGER:WITHDRAW]
4. *Pay utility bills* - Telecom, electricity [TRIGGER:BILL]
5. *Deposit Crypto* - Get addresses [TRIGGER:DEPOSIT]
6. *KYC Verification* - Authenticate [TRIGGER:KYC]

_Simply type a command or select an option from the menu list!_`;
      } else {
        replyText = `🤖 *FastXpend Assistant*
        
I've recorded that message: "_${message}_". Let me know if you would like me to trigger any of these transactions:
👉 *Convert Crypto* to Naira [TRIGGER:CONVERT]
👉 *Bank Withdrawal* [TRIGGER:WITHDRAW]
👉 *Pay Bills* (Airtime, electricity) [TRIGGER:BILL]
👉 *KYC verification* [TRIGGER:KYC]

Tip: Send a *voice command* or check your *crypto wallets* anytime!`;
      }

      // Small async delay to imitate a typing bot on WhatsApp
      await new Promise((resolve) => setTimeout(resolve, 800));
      return res.json({ reply: replyText });
    }
  });

  // API: Snap & Pay OCR Screenshot Reader Endpoint
  app.post("/api/snap-pay", async (req, res) => {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image received" });
    }

    // Strip header prefix if present (e.g. data:image/png;base64,)
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const snapPaySystemInstruction = `
You are the OCR analysis engine of FastXpend's WhatsApp Snap & Pay system.
The user uploaded a screenshot to pay or credit their account.
Extract key transactional parameters inside the image.

Analyze carefully to detect:
1. Is it a payment receipt, bank invoice, utility invoice, crypto wallet QR, or general text screenshot?
2. Explicit NGN Naira amounts or Crypto (BTC/USDT/ETH) amounts.
3. Target destination name, bank names, crypto addresses, or reference numbers.
4. Short descriptive summary.

You must return a standard JSON block with these keys:
{
  "detectedDocType": "Invoices/Receipts/Crypto QR/etc.",
  "extractedAmount": 15000,
  "currency": "NGN or USDT/BTC/ETH",
  "recipientName": "Name or Code",
  "recipientAccount": "Bank number or Crypto Address string",
  "reason": "Airtime payment, utility bill, peer payout, or crypto wallet topup",
  "descriptionSummary": "Extracted summary of what the document represents"
}
Keep numeric values as numbers, and if currency is not Naira, map it correctly.
If you cannot identify details, construct educated guesses based on the visual layout.
`;

    if (ai) {
      try {
        const imagePart = {
          inlineData: {
            mimeType: "image/png",
            data: cleanBase64,
          },
        };
        const textPart = {
          text: "Parse this screenshot to extract payment items for the FastXpend Snap & Pay transaction.",
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [imagePart, textPart],
          config: {
            systemInstruction: snapPaySystemInstruction,
            responseMimeType: "application/json",
          },
        });

        const textResponse = response.text || "{}";
        const parsed = JSON.parse(textResponse);
        return res.json({ result: parsed });
      } catch (err: any) {
        console.error("Gemini Snap-Pay Extraction error:", err);
      }
    }

    // Fallback Mock parser in case of missing internet or environment key
    // This dynamically mocks extraction on any uploaded image for the user to experience Snap & Pay
    const amountMock = Math.floor(Math.random() * 4 + 1) * 5000;
    const items = ["AEC Utility Bills", "Ikeja Electric Prepaid", "Binance Crypto Pay invoice", "Naira Peer Deposit Slip"];
    const activeItem = items[Math.floor(Math.random() * items.length)];

    setTimeout(() => {
      res.json({
        result: {
          detectedDocType: "Payment Invoice Screenshot",
          extractedAmount: amountMock,
          currency: "NGN",
          recipientName: activeItem,
          recipientAccount: "0199582848",
          reason: "Utility / Direct Transfer Invoice",
          descriptionSummary: `AI-extracted ${activeItem} voucher for ₦${amountMock.toLocaleString()} detected from screenshot.`,
        },
      });
    }, 1500);
  });

  // API: Voice Command transcription processing
  app.post("/api/voice-command", async (req, res) => {
    const { audioBase64, mimeType } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: "No audio data received" });
    }

    // Strip header prefix if present
    const cleanAudioBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");

    const voicePrompt = `
Analyze the voice command for FastXpend. The user is executing a chat-based command on WhatsApp using a voice note.
Read what the user said (using transcription capability) and extract the command intent, requested amount, targets, and currency details.

Provide output in JSON format:
{
  "transcript": "Original transcribed words...",
  "intent": "convert_crypto" | "withdraw_bank" | "pay_bill" | "check_balance" | "unknown",
  "amount": number or null,
  "currency": "NGN" | "USDT" | "BTC" | "ETH" | null,
  "destTarget": "John" | "bank details" | "airtime" | null
}
`;

    if (ai) {
      try {
        const audioPart = {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: cleanAudioBase64,
          },
        };
        const textPart = {
          text: "Transcribe and extract the transaction parameters from this voice note.",
        };

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [audioPart, textPart],
          config: {
            systemInstruction: voicePrompt,
            responseMimeType: "application/json",
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        return res.json(parsed);
      } catch (err: any) {
        console.error("Gemini Voice command processing error:", err);
      }
    }

    // Robust simulated response based on random inputs
    const mockTranscripts = [
      "withdraw 15000 naira to my standard chartered bank account",
      "convert my 50 usdt balance to naira right now please",
      "check my wallet balance fastxpend",
      "pay electricity bill with 10000 naira",
    ];
    const transcript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];

    let intent = "unknown";
    let amount: number | null = null;
    let currency: string | null = null;

    if (transcript.includes("withdraw")) {
      intent = "withdraw_bank";
      amount = 15000;
      currency = "NGN";
    } else if (transcript.includes("convert")) {
      intent = "convert_crypto";
      amount = 50;
      currency = "USDT";
    } else if (transcript.includes("balance")) {
      intent = "check_balance";
    } else if (transcript.includes("electricity")) {
      intent = "pay_bill";
      amount = 10000;
      currency = "NGN";
    }

    setTimeout(() => {
      res.json({
        transcript,
        intent,
        amount,
        currency,
        destTarget: "Live Simulation Account",
      });
    }, 1200);
  });

  // Serve static assets or mount Vite Developer server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FastXpend applet server is running on http://localhost:${PORT}`);
  });
}

startServer();
