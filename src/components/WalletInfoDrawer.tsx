import React from "react";
import { UserAccount, Transaction } from "../types";
import { ShieldCheck, Calendar, Wallet, Banknote, HelpCircle, History, Landmark, X, TrendingUp } from "lucide-react";

interface WalletInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount;
  rates: { USDT: number; BTC: number; ETH: number; feePercent: number };
}

export const WalletInfoDrawer: React.FC<WalletInfoDrawerProps> = ({
  isOpen,
  onClose,
  account,
  rates,
}) => {
  if (!isOpen) return null;

  // Calculate analytics
  const totalVolumeCleared = account.transactions
    .filter((tx) => tx.status === "completed")
    .reduce((sum, tx) => {
      if (tx.currency === "NGN") {
        return sum + tx.amount;
      }
      const rate = rates[tx.currency as keyof typeof rates];
      if (rate) {
        return sum + tx.amount * rate;
      }
      return sum + tx.amount;
    }, 0);

  const counts: { [key: string]: number } = {};
  account.transactions.forEach((tx) => {
    const t = tx.type;
    counts[t] = (counts[t] || 0) + 1;
  });

  let mostFrequentType = "None";
  let maxCount = 0;
  Object.entries(counts).forEach(([type, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentType = type;
    }
  });

  const getCurrencySymbol = (currency: string) => {
    if (currency === "BTC") return "₿";
    if (currency === "ETH") return "Ξ";
    if (currency === "USDT" || currency === "USD") return "$";
    return "₦";
  };

  const formatTxType = (type: string) => {
    if (type === "None") return "NO RECORDS";
    return type.replace("_", " ").toUpperCase();
  };

  return (
    <div className="w-80 h-full bg-[#0F0F0F] border-l border-white/10 text-slate-100 flex flex-col font-sans transition-all duration-300">
      {/* Drawer Header */}
      <div className="h-[60px] bg-[#161616] px-4 flex items-center justify-between border-b border-white/10 font-mono">
        <div className="flex items-center gap-3">
          <X size={15} className="text-zinc-500 hover:text-white cursor-pointer transition-colors" onClick={onClose} />
          <h3 className="font-bold text-xs uppercase tracking-widest text-[#F5F5F5]">PROTOCOL INFO</h3>
        </div>
        <span className="text-[8px] tracking-widest border border-emerald-500/30 bg-emerald-505/5 text-emerald-400 px-2 py-0.5 rounded-none font-bold uppercase select-none">VERIFIED</span>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Profile Stats */}
        <div className="bg-[#161616] p-4 rounded-none border border-white/10 text-center space-y-3 font-mono">
          <div className="w-14 h-14 bg-black border border-white/15 mx-auto flex items-center justify-center text-emerald-400 text-sm font-bold font-mono">
            FX
          </div>
          <div>
            <h4 className="font-bold text-[11px] uppercase tracking-widest text-slate-200 mt-1">{account.name}</h4>
            <p className="text-[9px] tracking-wide text-zinc-500">{account.phone}</p>
          </div>
          <div className="flex justify-center gap-1.5 pt-1">
            <span className={`text-[8px] tracking-wider font-bold px-2 py-0.5 border rounded-none uppercase ${
              account.kycStatus === 'verified' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-red-900/30 bg-red-900/5 text-red-400'
            }`}>
              KYC: {account.kycStatus.toUpperCase()}
            </span>
            <span className="text-[8px] tracking-wider border border-white/10 bg-black text-zinc-400 px-2 py-0.5 rounded-none font-bold uppercase">
              PIN: {account.pinSet ? "SET" : "NONE"}
            </span>
          </div>
        </div>

        {/* Live Exchange Rate Monitor */}
        <div className="space-y-2 bg-[#161616] p-4 rounded-none border border-white/10 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2 mb-2">
            <span className="font-bold uppercase tracking-wider text-[9px] text-zinc-500">LIVE RATES (NGN)</span>
            <span className="text-[#10b981] flex items-center gap-1 text-[8px] uppercase tracking-widest">
              <TrendingUp size={10} className="animate-pulse" /> SYNC_OK
            </span>
          </div>
          <div className="space-y-2.5 text-[10px] uppercase font-mono">
            <div className="flex justify-between items-center text-zinc-300">
              <span className="text-zinc-500 font-bold">USDT RATE:</span>
              <span className="text-white font-semibold">₦{rates.USDT?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-300">
              <span className="text-zinc-500 font-bold">BTC RATE:</span>
              <span className="text-white font-semibold">₦{rates.BTC?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-300">
              <span className="text-zinc-500 font-bold">ETH RATE:</span>
              <span className="text-white font-semibold">₦{rates.ETH?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Simulated Wallet Balances (Under-the-hood State Dashboard) */}
        <div className="space-y-2 font-mono">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold uppercase tracking-widest text-[9px]">
            <Wallet size={11} className="text-emerald-400" />
            <span>METRIC LEDGERS</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Naira */}
            <div className="bg-[#161616] p-3 rounded-none border border-white/10">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 block mb-1">Naira Wallet</span>
              <span className="text-[11px] text-emerald-400 font-bold block">₦{account.balances.NGN?.toLocaleString()}</span>
            </div>
            {/* USDT */}
            <div className="bg-[#161616] p-3 rounded-none border border-white/10">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 block mb-1">USDT Port</span>
              <span className="text-[11px] text-zinc-100 font-bold block">${account.balances.USDT?.toLocaleString()}</span>
            </div>
            {/* BTC */}
            <div className="bg-[#161616] p-2.5 rounded-none border border-white/10 col-span-2 flex justify-between px-3 items-center">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Bitcoin (BTC)</span>
              <span className="text-[10px] text-zinc-100 font-bold">₿ {account.balances.BTC}</span>
            </div>
            {/* ETH */}
            <div className="bg-[#161616] p-2.5 rounded-none border border-white/10 col-span-2 flex justify-between px-3 items-center">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold">Ethereum (ETH)</span>
              <span className="text-[10px] text-zinc-100 font-bold">Ξ {account.balances.ETH}</span>
            </div>
          </div>
        </div>

        {/* CLEARING METRICS SUMMARY STATS */}
        <div className="space-y-3 bg-[#161616] p-4 rounded-none border border-white/10 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-2 mb-1">
            <span className="font-bold uppercase tracking-wider text-[9px] text-zinc-500">CLEARING STATISTICS</span>
            <span className="text-emerald-400 text-[8px] uppercase tracking-widest font-bold">AUDIT_RUNNING</span>
          </div>
          
          <div className="space-y-3 font-mono uppercase">
            <div className="space-y-1">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 block">Total Volume Cleared</span>
              <span className="text-[13px] font-bold text-emerald-400">₦{totalVolumeCleared.toLocaleString()}</span>
              <span className="text-[7px] text-zinc-500 tracking-wide block">Based on completed transactions</span>
            </div>

            <div className="space-y-1 pt-2.5 border-t border-white/5">
              <span className="text-[8px] uppercase tracking-wider text-zinc-500 block">Most Frequent Category</span>
              <span className="text-[11px] text-white font-semibold block">{formatTxType(mostFrequentType)}</span>
              {maxCount > 0 && (
                <span className="text-[7px] text-zinc-500 tracking-wide block">{maxCount} {maxCount === 1 ? 'OPERATION' : 'OPERATIONS'} DEPLOYED</span>
              )}
            </div>
          </div>
        </div>

        {/* Contact detail description */}
        <div className="space-y-1.5 text-xs bg-[#161616] p-4 rounded-none border border-white/10 font-mono">
          <span className="text-[8px] text-zinc-500 font-bold uppercase block tracking-widest">CLEARING STATEMENT</span>
          <p className="text-zinc-400 leading-relaxed text-[10px] uppercase">
            WhatsApp simulated clearance channel. Instantly routing web ledger assets with zero UI friction.
          </p>
          <div className="flex items-center gap-1.5 text-[8px] uppercase tracking-wide text-zinc-650 pt-1">
            <Calendar size={10} className="text-zinc-600" />
            <span className="text-zinc-500">INITIATED // JUNE_2026</span>
          </div>
        </div>

        {/* Real-time State Receipts (Transaction History List) */}
        <div className="space-y-2 font-mono">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold uppercase tracking-widest text-[9px]">
            <History size={11} className="text-zinc-600" />
            <span>AUDIT CLEARING RECAP</span>
          </div>
          
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {account.transactions.length === 0 ? (
              <p className="text-[10px] uppercase text-center text-zinc-600 py-4 tracking-widest">No clearance logs</p>
            ) : (
              account.transactions.map((tx) => (
                <div key={tx.id} className="bg-[#161616] hover:bg-[#1a1a1a] p-2.5 rounded-none text-xs space-y-1 transition-colors border border-white/10 font-mono">
                  <div className="flex justify-between items-center text-[8px] tracking-wide uppercase">
                    <span className="font-bold text-zinc-500">{tx.type}</span>
                    <span className="text-zinc-600">{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center font-bold text-[10px] uppercase">
                    <span className="text-zinc-300 truncate max-w-[120px] block">{tx.description}</span>
                    <span className={tx.type === 'deposit' || tx.type === 'conversion' ? 'text-emerald-400' : 'text-zinc-400'}>
                      {tx.type === 'deposit' || tx.type === 'conversion' ? '+' : '-'}
                      {getCurrencySymbol(tx.currency)}{tx.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
