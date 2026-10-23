import { randomUUID } from "crypto";
import {
  Balance,
  CurrencyCode,
  Transaction,
  WalletRepository,
} from "../types/wallet.types";
import { SUPPORTED_CURRENCIES } from "../config/currencies";

// Wallet fija mientras no exista el módulo de usuarios.
export const DEFAULT_WALLET_ID = "wallet-demo";

// Saldos iniciales de ejemplo (para desarrollo y pruebas).
const INITIAL_AMOUNTS: Record<CurrencyCode, number> = {
  ARS: 280000,
  USD: 520,
  COP: 900000,
  EUR: 92.34,
};

// Redondeo a 2 decimales, igual que decimal(15,2) en la base de datos.
const round2 = (value: number): number => Math.round(value * 100) / 100;

export class InMemoryWalletRepository implements WalletRepository {
  private balances = new Map<string, Balance>();
  private transactions: Transaction[] = [];

  constructor() {
    this.reset();
  }

  private key(walletId: string, currency: CurrencyCode): string {
    return `${walletId}:${currency}`;
  }

  // Deja los datos como al inicio. Útil para los tests.
  reset(): void {
    this.balances.clear();
    this.transactions = [];

    for (const { code } of SUPPORTED_CURRENCIES) {
      this.balances.set(this.key(DEFAULT_WALLET_ID, code), {
        id: randomUUID(),
        walletId: DEFAULT_WALLET_ID,
        currencyCode: code,
        amount: INITIAL_AMOUNTS[code] ?? 0,
        updatedAt: new Date(),
      });
    }
  }

  async getBalances(walletId: string): Promise<Balance[]> {
    return [...this.balances.values()].filter((b) => b.walletId === walletId);
  }

  async getBalance(
    walletId: string,
    currency: CurrencyCode
  ): Promise<Balance | null> {
    return this.balances.get(this.key(walletId, currency)) ?? null;
  }

  async setBalance(
    walletId: string,
    currency: CurrencyCode,
    amount: number
  ): Promise<Balance> {
    const existing = this.balances.get(this.key(walletId, currency));

    const updated: Balance = {
      id: existing?.id ?? randomUUID(),
      walletId,
      currencyCode: currency,
      amount: round2(amount),
      updatedAt: new Date(),
    };

    this.balances.set(this.key(walletId, currency), updated);
    return updated;
  }

  async saveTransaction(
    tx: Omit<Transaction, "id" | "createdAt">
  ): Promise<Transaction> {
    const saved: Transaction = { ...tx, id: randomUUID(), createdAt: new Date() };
    this.transactions.push(saved);
    return saved;
  }
}

// Instancia única que usarán los servicios.
export const walletRepository: WalletRepository = new InMemoryWalletRepository();