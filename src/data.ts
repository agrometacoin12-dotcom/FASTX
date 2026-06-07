import { UserAccount, Message } from "./types";

export const NIGERIAN_BANKS = [
  "Access Bank",
  "Guaranty Trust Bank (GTB)",
  "Zenith Bank",
  "United Bank for Africa (UBA)",
  "First Bank of Nigeria",
  "Kuda Microfinance Bank",
  "Moniepoint MFB",
  "Opay",
  "Standard Chartered Bank",
  "Fidelity Bank",
];

export const UTILITY_PROVIDERS = {
  airtime: [
    { id: "mtn_air", name: "MTN Nigeria", fee: 0 },
    { id: "airtel_air", name: "Airtel Nigeria", fee: 0 },
    { id: "glo_air", name: "Glo Mobile", fee: 0 },
    { id: "9mobile_air", name: "9mobile", fee: 0 },
  ],
  data: [
    { id: "mtn_data", name: "MTN Data Gigabyte", fee: 0 },
    { id: "airtel_data", name: "Airtel Unlimited Day", fee: 0 },
    { id: "starlink_sub", name: "Starlink Service", fee: 200 },
  ],
  electricity: [
    { id: "ikeja_elec", name: "Ikeja Electric (IKEDC)", fee: 100 },
    { id: "eko_elec", name: "Eko Electricity (EKEDC)", fee: 100 },
    { id: "abuja_elec", name: "Abuja Electricity (AEDC)", fee: 100 },
  ],
};

export const INITIAL_USER_ACCOUNT: UserAccount = {
  name: "Agro Meta User",
  phone: "+234 812 345 6789",
  kycStatus: "unverified",
  balances: {
    NGN: 135000,
    USDT: 450,
    BTC: 0.015,
    ETH: 0.28,
  },
  addresses: {
    USDT: "TX7N28fJb41asg82jsVna8shHj39asKq1A",
    BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfJH7",
    ETH: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  },
  transactions: [
    {
      id: "tx_001",
      type: "deposit",
      amount: 450,
      currency: "USDT",
      status: "completed",
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
      description: "External USDT Wallet Deposit",
      hash: "0x3af821bc089db0128...",
    },
    {
      id: "tx_002",
      type: "conversion",
      amount: 15000,
      currency: "NGN",
      status: "completed",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      description: "Converted 10 USDT to Naira",
    },
    {
      id: "tx_003",
      type: "bill_payment",
      amount: 2500,
      currency: "NGN",
      status: "completed",
      timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
      description: "MTN Mobile Airtime Top-up",
    },
  ],
  pinSet: true,
  pinCode: "1234",
};

export const PRESET_MESSAGES = (accountName: string): Message[] => [
  {
    id: "init_0",
    sender: "bot",
    type: "text",
    text: `👋 Hello *${accountName}*! Welcome to *FastXpend* - Your 24/7 autonomous WhatsApp Crypto transaction engine. 🚀

Convert crypto to Naira (NGN) instantly, withdraw to any Nigerian bank, swap tokens, pay utility bills, or check active balances entirely right here.

Send any of the following numbers, commands, or click on the helpers below:
• Type *Menu* to see the transactional panel
• Type *Balance* to view current wallets
• Type *Convert* to swap USDT/BTC/ETH to Naira
• Send a *voice note* detailing your transaction
• Upload a *receipt/QR screenshot* to Snap & Pay`,
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
];
