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
  // Consultas de balances.
  getBalances(walletId: string): Promise<Balance[]>;

  getBalance(
    walletId: string,
    currency: CurrencyCode
  ): Promise<Balance | null>;

  // Consultas de movimientos.
  getTransactions(
    walletId: string,
    limit?: number
  ): Promise<Transaction[]>;

  // Métodos utilizados por el repositorio en memoria.
  // PostgreSQL utiliza operaciones atómicas en su lugar.
  setBalance?(
    walletId: string,
    currency: CurrencyCode,
    amount: number
  ): Promise<Balance>;

  saveTransaction?(
    tx: Omit<Transaction, "id" | "createdAt">
  ): Promise<Transaction>;

  // Operaciones atómicas para PostgreSQL.
  depositAtomic?(
    walletId: string,
    currency: CurrencyCode,
    amount: number,
    description?: string
  ): Promise<Transaction>;

  convertAtomic?(
    walletId: string,
    from: CurrencyCode,
    to: CurrencyCode,
    amount: number,
    convertedAmount: number,
    rate: number,
    description?: string
  ): Promise<Transaction>;

  // Transferencia entre dos billeteras en una sola operación atómica (PostgreSQL).
  transferAtomic?(
    fromWalletId: string,
    toWalletId: string,
    currency: CurrencyCode,
    amount: number,
    sentDescription: string,
    receivedDescription: string
  ): Promise<Transaction>;

  // Ejecuta varias escrituras como una unidad; si algo falla, se revierten (memoria).
  withTransaction?<T>(
    fn: (repo: WalletRepository) => Promise<T>
  ): Promise<T>;
}

