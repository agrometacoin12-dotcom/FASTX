export interface WalletBalances {
  NGN: number;
  BTC: number;
  USDT: number;
  ETH: number;
}

export interface WalletAddresses {
  BTC: string;
  USDT: string;
  ETH: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'conversion' | 'bill_payment' | 'transfer';
  amount: number;
  currency: 'NGN' | 'BTC' | 'USDT' | 'ETH';
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
  description: string;
  hash?: string;
}

export interface UserAccount {
  name: string;
  phone: string;
  kycStatus: 'unverified' | 'pending' | 'verified';
  kycDocType?: string;
  kycDocNumber?: string;
  balances: WalletBalances;
  addresses: WalletAddresses;
  transactions: Transaction[];
  pinSet: boolean;
  pinCode?: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  type: 'text' | 'image' | 'voice' | 'card';
  text: string;
  mediaUrl?: string; // base64 or object URL for images/audio
  voiceDuration?: number; // in seconds
  timestamp: string;
  cardType?: 'rate_convert' | 'bank_withdraw' | 'bill_payment' | 'kyc_setup' | 'pin_confirm' | 'receipt' | 'wallet_info';
  cardData?: any; // versatile storage for interactive flow cards
}
