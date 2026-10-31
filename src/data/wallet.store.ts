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
  private seeded = new Set<string>();

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
    this.seeded.clear();
    this.seedWallet(DEFAULT_WALLET_ID);
  }

  // Cada wallet nueva (una por usuario) arranca con los saldos de ejemplo.
  private seedWallet(walletId: string): void {
    for (const { code } of SUPPORTED_CURRENCIES) {
      this.balances.set(this.key(walletId, code), {
        id: randomUUID(),
        walletId,
        currencyCode: code,
        amount: INITIAL_AMOUNTS[code] ?? 0,
        updatedAt: new Date(),
      });
    }
  }

  private ensureWallet(walletId: string): void {
    if (!this.seeded.has(walletId) && !this.hasBalances(walletId)) {
      this.seedWallet(walletId);
    }
    this.seeded.add(walletId);
  }

  private hasBalances(walletId: string): boolean {
    return SUPPORTED_CURRENCIES.some((c) =>
      this.balances.has(this.key(walletId, c.code))
    );
  }

  async getBalances(walletId: string): Promise<Balance[]> {
    this.ensureWallet(walletId);
    return [...this.balances.values()].filter((b) => b.walletId === walletId);
  }

  async getBalance(
    walletId: string,
    currency: CurrencyCode
  ): Promise<Balance | null> {
    this.ensureWallet(walletId);
    return this.balances.get(this.key(walletId, currency)) ?? null;
  }

  async setBalance(
    walletId: string,
    currency: CurrencyCode,
    amount: number
  ): Promise<Balance> {
    this.ensureWallet(walletId);
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
  async getTransactions(walletId: string, limit = 20): Promise<Transaction[]> {
    return this.transactions
      .filter((t) => t.walletId === walletId)
      .reverse() // las más recientes primero
      .slice(0, limit);
  }
    // Si algo falla dentro de `fn`, se restauran los datos como estaban.
  async withTransaction<T>(
    fn: (repo: WalletRepository) => Promise<T>
  ): Promise<T> {
    const balancesBackup = new Map(this.balances);
    const transactionsBackup = [...this.transactions];
    try {
      return await fn(this);
    } catch (error) {
      this.balances.clear();
      for (const [key, value] of balancesBackup) {
        this.balances.set(key, value);
      }
      this.transactions.splice(0, this.transactions.length, ...transactionsBackup);
      throw error;
    }
  }
}

  

// Instancia única que usarán los servicios.
export const walletRepository: WalletRepository = new InMemoryWalletRepository();