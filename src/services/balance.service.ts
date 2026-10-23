import { currencyService } from "./currency.service";
import { DEFAULT_WALLET_ID, walletRepository } from "../data/wallet.store";
import {
  Balance,
  CurrencyCode,
  TotalBalance,
  WalletRepository,
} from "../types/wallet.types";

const round2 = (v: number): number => Math.round(v * 100) / 100;

export const createBalanceService = (repo: WalletRepository) => ({
  // Todos los saldos de la wallet (uno por moneda).
  async getBalances(walletId: string = DEFAULT_WALLET_ID): Promise<Balance[]> {
    return repo.getBalances(walletId);
  },

  // Saldo de una sola moneda.
  async getBalance(
    currency: string,
    walletId: string = DEFAULT_WALLET_ID
  ): Promise<Balance> {
    if (!currencyService.isSupported(currency)) {
      throw new Error("Moneda no soportada");
    }
    const balance = await repo.getBalance(walletId, currency);
    if (!balance) {
      throw new Error("La wallet no tiene saldo en esa moneda");
    }
    return balance;
  },

  // Suma de todos los saldos convertidos a una moneda base (USD por defecto).
  async getTotalBalance(
    walletId: string = DEFAULT_WALLET_ID,
    baseCurrency: CurrencyCode = "USD"
  ): Promise<TotalBalance> {
    if (!currencyService.isSupported(baseCurrency)) {
      throw new Error("Moneda base no soportada");
    }

    const balances = await repo.getBalances(walletId);

    const breakdown = balances.map((b) => {
      const converted =
        b.currencyCode === baseCurrency || b.amount === 0
          ? b.amount
          : currencyService.convert(b.amount, b.currencyCode, baseCurrency).result;

      return {
        currencyCode: b.currencyCode,
        amount: b.amount,
        convertedAmount: round2(converted),
      };
    });

    const total = round2(breakdown.reduce((sum, b) => sum + b.convertedAmount, 0));

    return { walletId, baseCurrency, total, breakdown };
  },
});

// Instancia lista para usar con el repositorio en memoria.
export const balanceService = createBalanceService(walletRepository);