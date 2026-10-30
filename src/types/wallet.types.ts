export type CurrencyCode = string; // "USD", "EUR", "COP"

export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
}

export interface Balance {
  id: string;
  walletId: string;
  currencyCode: CurrencyCode;
  amount: number;
  updatedAt: Date;
}

export type TransactionType = "deposit" | "convert" | "transfer_out" | "transfer_in";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  walletId: string;
  contextId?: string;
  counterpartyWalletId?: string;
  type: TransactionType;
  currencyFrom: CurrencyCode;
  currencyTo: CurrencyCode;
  amountFrom: number;
  amountTo: number;
  rateUsed: number;
  status: TransactionStatus;
  description?: string;
  createdAt: Date;
}


export interface TotalBalance {
  walletId: string;
  baseCurrency: CurrencyCode;
  total: number;
  breakdown: {
    currencyCode: CurrencyCode;
    amount: number;       // saldo en su moneda original
    convertedAmount: number; // equivalente en la moneda base
  }[];
}

export interface WalletRepository {
  getBalances(walletId: string): Promise<Balance[]>;
  getBalance(walletId: string, currency: CurrencyCode): Promise<Balance | null>;
  setBalance(walletId: string, currency: CurrencyCode, amount: number): Promise<Balance>;
  saveTransaction(tx: Omit<Transaction, "id" | "createdAt">): Promise<Transaction>;
  getTransactions(walletId: string, limit?: number): Promise<Transaction[]>;
  withTransaction<T>(fn: (repo: WalletRepository) => Promise<T>): Promise<T>;
}
