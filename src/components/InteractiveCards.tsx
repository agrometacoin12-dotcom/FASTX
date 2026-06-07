import React, { useState, useEffect } from "react";
import { WalletBalances, Transaction, UserAccount } from "../types";
import { NIGERIAN_BANKS, UTILITY_PROVIDERS } from "../data";
import { ShieldCheck, ArrowRight, CheckCircle2, QrCode, ClipboardCheck, ClipboardCopy, Send, Landmark, Receipt, Zap } from "lucide-react";

interface InteractiveCardsProps {
  cardType: 'rate_convert' | 'bank_withdraw' | 'bill_payment' | 'kyc_setup' | 'pin_confirm' | 'receipt' | 'wallet_info';
  cardData?: any;
  account: UserAccount;
  onUpdateAccount: (updated: UserAccount) => void;
  onAddBotMessage: (text: string, cardType?: any, cardData?: any) => void;
  rates: { USDT: number; BTC: number; ETH: number; feePercent: number };
}

export const InteractiveCards: React.FC<InteractiveCardsProps> = ({
  cardType,
  cardData,
  account,
  onUpdateAccount,
  onAddBotMessage,
  rates,
}) => {
  // Common states
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [success, setSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Rate Convert States
  const [convertAmount, setConvertAmount] = useState(cardData?.amount || 50);
  const [convertCurrency, setConvertCurrency] = useState<'USDT' | 'BTC' | 'ETH'>(cardData?.currency || "USDT");
  const [calculatedNgn, setCalculatedNgn] = useState(0);
  const [convertFee, setConvertFee] = useState(0);

  // Bank Withdraw States
  const [selectedBank, setSelectedBank] = useState(NIGERIAN_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState(account.name);
  const [withdrawAmount, setWithdrawAmount] = useState(cardData?.amount || 10000);

  // Bill Payment States
  const [billCategory, setBillCategory] = useState<'airtime' | 'data' | 'electricity'>("airtime");
  const [billProviderId, setBillProviderId] = useState("");
  const [billTarget, setBillTarget] = useState(""); // Meter/Phone number
  const [billAmount, setBillAmount] = useState(2000);

  // KYC setup states
  const [kycDocType, setKycDocType] = useState("National Identity Card (NIN)");
  const [kycNumber, setKycNumber] = useState("");
  const [kycDocFile, setKycDocFile] = useState<File | null>(null);

  // Rate calculator effect
  useEffect(() => {
    if (cardType === "rate_convert") {
      const activeRate = rates[convertCurrency] || 1550;
      const totalRaw = convertAmount * activeRate;
      const fee = totalRaw * (rates.feePercent / 100);
      setCalculatedNgn(Math.round(totalRaw - fee));
      setConvertFee(Math.round(fee));
    }
  }, [convertAmount, convertCurrency, cardType, rates]);

  // Handle Clipboard Copy
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // State pin validator helper
  const isPinValid = (): boolean => {
    if (!account.pinSet) return true; // PIN not yet configured, bypass OR consider set to 1234
    if (pinInput === (account.pinCode || "1234")) {
      setPinError("");
      return true;
    }
    setPinError("❌ Incorrect 4-digit Transaction PIN");
    return false;
  };

  // Execute Swap Transaction
  const handleSwap = () => {
    if (!isPinValid()) return;

    // Check balance
    const currentCryptoVal = account.balances[convertCurrency];
    if (currentCryptoVal < convertAmount) {
      setPinError(`❌ Insufficient ${convertCurrency} balance. Current: ${currentCryptoVal}`);
      return;
    }

    // Deduct crypto and add Naira
    const newBalances = { ...account.balances };
    newBalances[convertCurrency] = parseFloat((currentCryptoVal - convertAmount).toFixed(6));
    newBalances.NGN = newBalances.NGN + calculatedNgn;

    const newTx: Transaction = {
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type: "conversion",
      amount: calculatedNgn,
      currency: "NGN",
      status: "completed",
      timestamp: new Date().toISOString(),
      description: `Swapped ${convertAmount} ${convertCurrency} to Naira`,
    };

    const updatedAccount: UserAccount = {
      ...account,
      balances: newBalances,
      transactions: [newTx, ...account.transactions],
    };

    onUpdateAccount(updatedAccount);
    setSuccess(true);

    setTimeout(() => {
      onAddBotMessage(
        `✅ *Swapped Successfully!*\n\nYou converted *${convertAmount} ${convertCurrency}* to *₦${calculatedNgn.toLocaleString()}*.\n\n• *New Naira Balance:* ₦${updatedAccount.balances.NGN.toLocaleString()}\n• *Transaction ID:* ${newTx.id.toUpperCase()}`,
        "receipt",
        newTx
      );
    }, 1000);
  };

  // Execute Bank Withdrawal
  const handleWithdrawal = () => {
    if (!isPinValid()) return;

    // Check balance
    if (account.balances.NGN < withdrawAmount + 100) {
      setPinError(`❌ Insufficient Naira balance. Needed: ₦${(withdrawAmount + 100).toLocaleString()}`);
      return;
    }

    const newBalances = { ...account.balances };
    newBalances.NGN = newBalances.NGN - (withdrawAmount + 100);

    const newTx: Transaction = {
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type: "withdrawal",
      amount: withdrawAmount,
      currency: "NGN",
      status: "completed",
      timestamp: new Date().toISOString(),
      description: `Withdrawal to ${selectedBank} (A/C: ${accountNumber})`,
    };

    const updatedAccount: UserAccount = {
      ...account,
      balances: newBalances,
      transactions: [newTx, ...account.transactions],
    };

    onUpdateAccount(updatedAccount);
    setSuccess(true);

    setTimeout(() => {
      onAddBotMessage(
        `🏦 *Withdrawal Dispatched!*\n\n• *Bank Name:* ${selectedBank}\n• *Account:* ${accountNumber}\n• *Amount:* ₦${withdrawAmount.toLocaleString()}\n• *Status:* Instantly Completed.\n\nYour withdrawal has been processed inside the automated payment clearing network.`,
        "receipt",
        newTx
      );
    }, 1000);
  };

  // Execute Bill Payment
  const handleBillPayment = () => {
    if (!isPinValid()) return;

    if (account.balances.NGN < billAmount) {
      setPinError(`❌ Insufficient Naira balance. Needed: ₦${billAmount.toLocaleString()}`);
      return;
    }

    const newBalances = { ...account.balances };
    newBalances.NGN = newBalances.NGN - billAmount;

    // Find provider name
    const providersList = UTILITY_PROVIDERS[billCategory];
    const provName = providersList.find(p => p.id === billProviderId)?.name || "Utility Provider";

    const newTx: Transaction = {
      id: "tx_" + Math.random().toString(36).substr(2, 9),
      type: "bill_payment",
      amount: billAmount,
      currency: "NGN",
      status: "completed",
      timestamp: new Date().toISOString(),
      description: `${provName} Recharge for ${billTarget}`,
    };

    const updatedAccount: UserAccount = {
      ...account,
      balances: newBalances,
      transactions: [newTx, ...account.transactions],
    };

    onUpdateAccount(updatedAccount);
    setSuccess(true);

    setTimeout(() => {
      onAddBotMessage(
        `⚡ *Utility Bill Payment Success!*\n\n• *Service:* ${provName}\n• *Reference/Number:* ${billTarget}\n• *Value paid:* ₦${billAmount.toLocaleString()}\n• *Reference PIN:* Auth-Approved.`,
        "receipt",
        newTx
      );
    }, 1000);
  };

  // Submit KYC
  const handleKycSubmit = () => {
    if (!kycNumber || kycNumber.length < 5) {
      setPinError("❌ Please enter a valid identification/BVN number.");
      return;
    }

    const updatedAccount: UserAccount = {
      ...account,
      kycStatus: "verified",
      kycDocType: kycDocType,
      kycDocNumber: kycNumber,
    };

    onUpdateAccount(updatedAccount);
    setSuccess(true);

    setTimeout(() => {
      onAddBotMessage(
        `🎉 *KYC Tier-2 Verified!*\n\nWe have automatically audited your National ID/BVN database coordinates. Your daily transaction limit is now boosted to *₦5,000,000*. Thank you! ✅`
      );
    }, 1000);
  };

  // Render Rate Conversion Form Card
  if (cardType === "rate_convert") {
    return (
      <div className="bg-[#161616] border border-white/10 text-slate-100 rounded-none p-4 shadow-xl max-w-sm mt-3 font-sans overflow-hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-100 tracking-widest uppercase font-mono">Instant Swap Portal</h4>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">FastXpend Cryptographic Conversion</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4 flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="text-emerald-400 animate-pulse" />
            <h5 className="text-[10px] font-mono tracking-widest uppercase text-emerald-300">PIN CODE CONFIRMED</h5>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">DEPLOYING TRANS OVER BLOCKCHAIN...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Input Cryptocurrency Select */}
            <div>
              <label className="text-[9px] text-[#10b981] font-bold uppercase tracking-widest block mb-1 font-mono">Convert Payload</label>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="number"
                  placeholder="0.0"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(parseFloat(e.target.value) || 0)}
                  className="col-span-2 bg-black border border-white/10 text-xs rounded-none px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={convertCurrency}
                  onChange={(e) => setConvertCurrency(e.target.value as any)}
                  className="col-span-2 bg-black border border-white/10 text-[10px] uppercase tracking-wider rounded-none px-2 py-1.5 text-emerald-400 font-mono focus:outline-none"
                >
                  <option value="USDT">USDT ($)</option>
                  <option value="BTC">BTC (₿)</option>
                  <option value="ETH">ETH (Ξ)</option>
                </select>
              </div>
            </div>

            {/* Calculations Indicator */}
            <div className="p-2.5 bg-black border border-white/5 rounded-none text-[10px] font-mono">
              <div className="flex justify-between text-zinc-400 mb-1">
                <span className="uppercase tracking-wide">INDEX LEVEL:</span>
                <span className="text-[#10b981] font-bold">₦{rates[convertCurrency]?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-400 mb-1">
                <span className="uppercase tracking-wide">CLEARANCE FEE:</span>
                <span>₦{convertFee?.toLocaleString()}</span>
              </div>
              <div className="border-t border-white/10 my-1.5 pt-1.5 flex justify-between font-bold text-white">
                <span className="text-[10px] text-zinc-300 uppercase tracking-wide">NET COORD NGN:</span>
                <span className="text-emerald-400 text-[11px]">₦{calculatedNgn?.toLocaleString()}</span>
              </div>
            </div>

            {/* Verification & Pin input */}
            <div className="space-y-1.5 bg-black p-2.5 rounded-none border border-white/10">
              <label className="text-[8px] text-zinc-500 font-bold tracking-widest block uppercase font-mono">4-Digit Transaction PIN</label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center bg-[#161616] border border-white/10 rounded-none py-1.5 text-sm tracking-widest text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              {pinError && <p className="text-[9px] text-red-400 font-mono text-center uppercase tracking-wider">{pinError}</p>}
            </div>

            <button
              onClick={handleSwap}
              disabled={convertAmount <= 0}
              className="w-full bg-emerald-500 hover:bg-white hover:text-black hover:border-white text-black text-[10px] font-mono tracking-widest uppercase py-2.5 px-3 border border-emerald-500 rounded-none transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              EXECUTE SWAP ORDER <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render Bank Withdrawal Card
  if (cardType === "bank_withdraw") {
    return (
      <div className="bg-[#161616] border border-white/10 text-slate-100 rounded-none p-4 shadow-xl max-w-sm mt-3 font-sans overflow-hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Landmark size={16} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-100 tracking-widest uppercase font-mono">PAYOUT ORDER</h4>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">FastXpend Instabill Settlement API</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4 flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="text-emerald-400 animate-pulse" />
            <h5 className="text-[10px] font-mono tracking-widest uppercase text-emerald-300">DISPATCHING FUNDS</h5>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">SETTLING LIVE VIA CBN ROUTER PORT</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select Bank */}
            <div className="space-y-1">
              <label className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase block font-mono">Receiving Bank Node</label>
              <select
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="w-full bg-black border border-white/10 text-[10px] uppercase tracking-wide rounded-none px-2.5 py-1.5 text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
              >
                {NIGERIAN_BANKS.map(b => (
                  <option key={b} value={b}>{b.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Account Routing Details */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 font-mono">Dest Account</label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-black border border-white/10 text-xs rounded-none px-2.5 py-1.5 text-slate-300 font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 font-mono">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="₦ Amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-white/10 text-xs rounded-none px-2.5 py-1.5 text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* Account verify preview */}
            {accountNumber.length === 10 && (
              <div className="p-2 bg-black border border-white/5 rounded-none block font-mono">
                <span className="text-[8px] text-zinc-500 block uppercase tracking-wide">Verified Identity Link:</span>
                <span className="text-[10px] text-emerald-400 font-medium">Agro Meta Client // STATUS_OK</span>
              </div>
            )}

            {/* Verification and PIN */}
            <div className="space-y-1 bg-black p-2.5 rounded-none border border-white/10 font-mono">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Authorize PIN</label>
                <span className="text-[8px] text-zinc-500 font-semibold">(NGN BAL: ₦{account.balances.NGN.toLocaleString()})</span>
              </div>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center bg-[#161616] border border-white/10 rounded-none py-1.5 text-sm tracking-widest text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              {pinError && <p className="text-[9px] text-red-400 font-mono text-center uppercase tracking-wider">{pinError}</p>}
            </div>

            <button
              onClick={handleWithdrawal}
              disabled={withdrawAmount < 500 || accountNumber.length < 10}
              className="w-full bg-emerald-500 hover:bg-white hover:text-black hover:border-white text-black text-[10px] font-mono tracking-widest uppercase py-2.5 px-3 border border-emerald-500 rounded-none transition-all duration-300 flex items-center justify-center gap-1.5"
            >
              DISPATCH ₦{withdrawAmount ? withdrawAmount.toLocaleString() : "0"} <Send size={12} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render Bill Payments Card
  if (cardType === "bill_payment") {
    const selectedProviders = UTILITY_PROVIDERS[billCategory] || [];

    return (
      <div className="bg-[#161616] border border-white/10 text-slate-100 rounded-none p-4 shadow-xl max-w-sm mt-3 font-sans overflow-hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap size={16} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-100 tracking-widest uppercase font-mono font-sans">Payment Router</h4>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">FastXpend Utility Clearance</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4 flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="text-emerald-400 animate-pulse" />
            <h5 className="text-[10px] font-mono tracking-widest uppercase text-emerald-300">DISCHARGE COMPLETED</h5>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">UTILITY TOKEN SENT TO BENEFICIARY</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Choose category tabs */}
            <div className="grid grid-cols-3 gap-1 bg-black p-1 border border-white/10 rounded-none">
              {(["airtime", "data", "electricity"] as any[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setBillCategory(cat);
                    setBillProviderId(UTILITY_PROVIDERS[cat][0]?.id);
                    setBillTarget("");
                  }}
                  className={`text-[9px] py-1 font-mono tracking-widest font-semibold uppercase rounded-none transition-colors duration-300 ${
                    billCategory === cat ? "bg-emerald-500 text-black shadow-none" : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Provider and inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 font-mono">Vendor Node</label>
                <select
                  value={billProviderId}
                  onChange={(e) => setBillProviderId(e.target.value)}
                  className="w-full bg-black border border-white/10 text-[10px] uppercase tracking-wide rounded-none px-2 py-1.5 text-zinc-300 font-mono focus:outline-none"
                >
                  {selectedProviders.map(p => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em] block mb-1 font-mono">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="₦"
                  value={billAmount}
                  onChange={(e) => setBillAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-black border border-white/10 text-xs rounded-none px-2.5 py-1.5 text-slate-300 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Target identifier inputs */}
            <div>
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em] block mb-1 font-mono">
                {billCategory === "electricity" ? "Prepaid Meter ID" : "Phone Destination"}
              </label>
              <input
                type="text"
                placeholder={billCategory === "electricity" ? "Meter e.g. 05882348581" : "e.g. +234 812 345 6789"}
                value={billTarget}
                onChange={(e) => setBillTarget(e.target.value)}
                className="w-full bg-black border border-white/10 text-xs rounded-none px-2.5 py-1.5 text-slate-300 font-mono focus:outline-none"
              />
            </div>

            {/* Pin and balance safety check */}
            <div className="space-y-1 bg-black p-2.5 rounded-none border border-white/10 font-mono">
              <label className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">Transaction PIN</label>
              <input
                type="password"
                maxLength={4}
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                className="w-full text-center bg-[#161616] border border-white/10 rounded-none py-1.5 text-sm tracking-widest text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              {pinError && <p className="text-[9px] text-red-400 font-mono text-center uppercase tracking-wider">{pinError}</p>}
            </div>

            <button
              onClick={handleBillPayment}
              disabled={billAmount <= 0 || !billTarget}
              className="w-full bg-emerald-500 hover:bg-white hover:text-black hover:border-white text-black text-[10px] font-mono tracking-widest uppercase py-2.5 px-3 border border-emerald-500 rounded-none transition-all duration-300"
            >
              PAY UTILITY REGISTRY
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render KYC Card setup
  if (cardType === "kyc_setup") {
    return (
      <div className="bg-[#161616] border border-white/10 text-slate-100 rounded-none p-4 shadow-xl max-w-sm mt-3 font-sans overflow-hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-white/10 mb-3">
          <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h4 className="text-[10px] font-bold text-slate-100 tracking-widest uppercase font-mono">ID Compliance Node</h4>
            <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">Upgrade Transaction Threshold limit</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-4 flex flex-col items-center gap-2">
            <CheckCircle2 size={24} className="text-emerald-400 animate-pulse" />
            <h5 className="text-[10px] font-mono tracking-widest uppercase text-emerald-300">COMPLIANCE COMPLETED</h5>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono font-mono">LIMIT UPGRADE AUTHORIZED LINK</p>
          </div>
        ) : (
          <div className="space-y-3 font-mono">
            <div>
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Verify Document Type</label>
              <select
                value={kycDocType}
                onChange={(e) => setKycDocType(e.target.value)}
                className="w-full bg-black border border-white/10 text-[10px] uppercase tracking-wide rounded-none px-2.5 py-1.5 text-zinc-300 focus:outline-none"
              >
                <option value="National Identity Card (NIN)">NIN DIGITAL REGISTRY</option>
                <option value="Bank Verification Number (BVN)">BVN SYSTEM LINK</option>
                <option value="Nigerian Voter's Card">VOTERS SPEC CARD</option>
                <option value="International Passport">INTERNATIONAL SYSTEM PASSPORT</option>
              </select>
            </div>

            <div>
              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Registry Core Number</label>
              <input
                type="text"
                placeholder="22295847192"
                value={kycNumber}
                onChange={(e) => setKycNumber(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-black border border-white/10 text-xs rounded-none px-2.5 py-1.5 text-zinc-300 focus:outline-none"
              />
            </div>

            {/* Simulated file drag upload */}
            <div className="border border-dashed border-white/10 bg-black p-3 text-center">
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1 font-bold">Document Attachment</span>
              <p className="text-[8px] uppercase tracking-wide text-zinc-600 mb-2">Drag in JPG/PNG identifier file</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setKycDocFile(e.target.files?.[0] || null)}
                className="hidden"
                id="kyc-file-upl"
              />
              <label
                htmlFor="kyc-file-upl"
                className="bg-[#161616] border border-white/10 hover:border-white text-[9px] font-bold uppercase tracking-wider text-emerald-400 px-3 py-1 cursor-pointer rounded-none border-solid transition-colors duration-300"
              >
                {kycDocFile ? kycDocFile.name.toUpperCase() : "SELECT SYSTEM IMAGE"}
              </label>
            </div>

            {pinError && <p className="text-[10px] text-red-400 font-medium text-center uppercase">{pinError}</p>}

            <button
              onClick={handleKycSubmit}
              className="w-full bg-emerald-500 hover:bg-white hover:text-black hover:border-white text-black text-[10px] font-mono tracking-widest uppercase py-2.5 px-3 border border-emerald-500 rounded-none transition-all duration-300"
            >
              SUBMIT COMPLIANCE RECORD
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render Address wallet deposit info
  if (cardType === "wallet_info") {
    return (
      <div className="bg-[#161616] border border-white/10 text-slate-100 rounded-none p-4 shadow-xl max-w-sm mt-3 font-mono space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-white/10">
          <QrCode size={16} className="text-emerald-400" />
          <h4 className="text-[10px] font-bold text-slate-100 uppercase tracking-widest font-mono">Wallet Coordinates</h4>
        </div>

        <div className="space-y-2 text-xs">
          {/* USDT TRC20 */}
          <div className="bg-black p-2.5 rounded-none border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-[#10b981] font-bold tracking-wider uppercase">USDT ADDRESS (TRC-20)</span>
              <button
                onClick={() => handleCopy(account.addresses.USDT, "usdt")}
                className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1"
              >
                {copiedKey === "usdt" ? <ClipboardCheck size={11} className="text-emerald-400" /> : <ClipboardCopy size={11} />}
              </button>
            </div>
            <code className="text-[9px] font-mono select-all break-all block text-zinc-400">{account.addresses.USDT}</code>
          </div>

          {/* BTC */}
          <div className="bg-black p-2.5 rounded-none border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase">BTC SYSTEM ADDRESS</span>
              <button
                onClick={() => handleCopy(account.addresses.BTC, "btc")}
                className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1"
              >
                {copiedKey === "btc" ? <ClipboardCheck size={11} className="text-emerald-400" /> : <ClipboardCopy size={11} />}
              </button>
            </div>
            <code className="text-[9px] font-mono select-all break-all block text-zinc-400">{account.addresses.BTC}</code>
          </div>

          {/* ETH ERC20 */}
          <div className="bg-black p-2.5 rounded-none border border-white/5">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase">ETH NODE ADDRESS (ERC-20)</span>
              <button
                onClick={() => handleCopy(account.addresses.ETH, "eth")}
                className="text-[9px] text-zinc-500 hover:text-white flex items-center gap-1"
              >
                {copiedKey === "eth" ? <ClipboardCheck size={11} className="text-emerald-400" /> : <ClipboardCopy size={11} />}
              </button>
            </div>
            <code className="text-[9px] font-mono select-all break-all block text-zinc-400">{account.addresses.ETH}</code>
          </div>
        </div>

        <p className="text-[8px] text-zinc-600 text-center uppercase tracking-wide">
          ⚠️ TRANSACTIONS SENT VIA INCORRECT PROTOCOLS CANNOT BE COMPENSATED.
        </p>
      </div>
    );
  }

  // Render Payout receipts
  if (cardType === "receipt") {
    const tx: Transaction = cardData || {
      id: "tx_example",
      type: "conversion",
      amount: 12000,
      currency: "NGN",
      status: "completed",
      timestamp: new Date().toISOString(),
      description: "Direct conversion swap",
    };

    return (
      <div className="bg-black border-l-2 border-l-emerald-400 border border-white/10 text-slate-100 rounded-none p-4 shadow-xl max-w-sm mt-3 font-mono relative">
        <div className="absolute top-0 right-0 p-2 text-emerald-400">
          <Receipt size={16} />
        </div>

        <h4 className="text-[9px] select-none text-zinc-500 font-bold tracking-widest uppercase mb-1">FASTXPEND TRANSFER SLIP</h4>
        <div className="text-[10px] space-y-1.5 text-zinc-300 border-b border-white/10 pb-3 mb-3">
          <div className="flex justify-between">
            <span className="uppercase tracking-wider">Slip ID:</span>
            <span className="text-white font-bold uppercase">{tx.id.toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wider">Cleared:</span>
            <span>{new Date(tx.timestamp).toLocaleString().toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wider">Transaction:</span>
            <span className="text-[#10b981] font-bold capitalize">{tx.type.replace("_", " ").toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wider">Value:</span>
            <span className="text-emerald-400 font-bold">₦{tx.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wider">Charges:</span>
            <span>₦100 fixed / zero</span>
          </div>
          <div className="flex justify-between">
            <span className="uppercase tracking-wide">Status:</span>
            <span className="text-emerald-400 font-bold uppercase select-none flex items-center gap-1">
              ● {tx.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="text-[9px] text-zinc-500">
          <span className="font-bold text-[8px] text-zinc-600 block uppercase tracking-widest">DESCRIPTION / TARGET DETECTOR</span>
          <span>{tx.description.toUpperCase()}</span>
        </div>
      </div>
    );
  }

  return null;
};
