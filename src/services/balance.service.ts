
import { currencyService } from "./currency.service";
import { DEFAULT_WALLET_ID, walletRepository } from "../data/wallet.store";
import {
  Balance,
  CurrencyCode,
  TotalBalance,
  WalletRepository,
} from "../types/wallet.types";
import { AppError } from "../utils/appError";
import { postgresWalletRepository } from "../data/postgres-wallet.repository";

const round2 = (v: number): number => Math.round(v * 100) / 100;

export const createBalanceService = (repo: WalletRepository) => ({
  // Todos los saldos disponibles de la wallet.
  async getBalances(walletId: string = DEFAULT_WALLET_ID): Promise<Balance[]> {
    return repo.getBalances(walletId);
  },

  // Saldo disponible de una sola moneda.
  async getBalance(
    currency: string,
    walletId: string = DEFAULT_WALLET_ID
  ): Promise<Balance> {
    if (!currencyService.isSupported(currency)) {
      throw new AppError("Moneda no soportada", 400);
    }

    const balance = await repo.getBalance(walletId, currency);

    if (!balance) {
      throw new AppError("La wallet no tiene saldo en esa moneda", 404);
    }

    return balance;
  },

  // Patrimonio total: saldos disponibles + espacios de ahorro.
  async getTotalBalance(
    walletId: string = DEFAULT_WALLET_ID,
    baseCurrency: CurrencyCode = "USD"
  ): Promise<TotalBalance> {
    if (!currencyService.isSupported(baseCurrency)) {
      throw new AppError("Moneda base no soportada", 400);
    }

    const { balances, reservedBalances } =
      await repo.getBalanceSnapshot(walletId);

    // Agrupar el dinero reservado por moneda.
    const reservedByCurrency = new Map<string, number>();

    for (const reserved of reservedBalances) {
      reservedByCurrency.set(
        reserved.currencyCode,
        round2(
          (reservedByCurrency.get(reserved.currencyCode) ?? 0) +
          reserved.amount
        )
      );
    }

    // Unir las monedas disponibles y reservadas.
    const currencies = new Set<string>([
      ...balances.map((balance) => balance.currencyCode),
      ...reservedByCurrency.keys(),
    ]);

    const breakdown = [...currencies].sort().map((currencyCode) => {
      const availableAmount =
        balances.find((balance) => balance.currencyCode === currencyCode)
          ?.amount ?? 0;

      const reservedAmount = reservedByCurrency.get(currencyCode) ?? 0;

      const amount = round2(availableAmount + reservedAmount);

      const converted =
        currencyCode === baseCurrency || amount === 0
          ? amount
          : currencyService.convert(amount, currencyCode, baseCurrency).result;

      return {
        currencyCode,
        amount,
        availableAmount,
        reservedAmount,
        convertedAmount: round2(converted),
      };
    });

    const total = round2(
      breakdown.reduce((sum, balance) => sum + balance.convertedAmount, 0)
    );

    return {
      walletId,
      baseCurrency,
      total,
      breakdown,
    };
  },
});

// Instancia lista para usar con el repositorio en memoria.
/**
 * En las pruebas usamos datos simulados.
 * En los demás entornos usamos PostgreSQL.
 */
export const balanceService = createBalanceService(
  process.env.NODE_ENV === "test"
    ? walletRepository
    : postgresWalletRepository
);
