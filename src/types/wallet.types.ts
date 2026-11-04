
export type CurrencyCode = string; // "ARS", "USD", "EUR", "COP"

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

// Saldo reservado en espacios de ahorro, agrupado por moneda.
export interface ReservedBalance {
  currencyCode: CurrencyCode;
  amount: number;
}

// Estado de los saldos obtenido en una misma lectura.
export interface BalanceSnapshot {
  balances: Balance[];
  reservedBalances: ReservedBalance[];
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
  feeAmount?: number;           // comisión cobrada en esta operación
  feeCurrency?: CurrencyCode;   // moneda de la comisión
  createdAt: Date;
}

// Patrimonio total de la billetera, incluyendo espacios de ahorro.
export interface TotalBalance {
  walletId: string;
  baseCurrency: CurrencyCode;
  total: number;

  breakdown: {
    currencyCode: CurrencyCode;

    // Saldo total: disponible + reservado.
    amount: number;

    // Dinero disponible para operaciones.
    availableAmount: number;

    // Dinero guardado en espacios de ahorro.
    reservedAmount: number;

    // Saldo total convertido a la moneda base.
    convertedAmount: number;
  }[];
}



export interface WalletRepository {
  // Consultas de balances disponibles.
  getBalances(walletId: string): Promise<Balance[]>;

  // Consulta de saldos reservados en espacios de ahorro.
  getReservedBalances(walletId: string): Promise<ReservedBalance[]>;

  getBalanceSnapshot(
    walletId: string
  ): Promise<BalanceSnapshot>;

  // Consulta de una moneda específica.
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
    feeAmount: number,
    description?: string
  ): Promise<Transaction>;

  // Transferencia entre dos billeteras en una sola operación atómica (PostgreSQL).
  transferAtomic?(
    fromWalletId: string,
    toWalletId: string,
    currency: CurrencyCode,
    amount: number,
    feeAmount: number,
    sentDescription: string,
    receivedDescription: string
  ): Promise<Transaction>;

  // Ejecuta varias escrituras como una unidad; si algo falla, se revierten (memoria).
  withTransaction?<T>(
    fn: (repo: WalletRepository) => Promise<T>
  ): Promise<T>;
}

