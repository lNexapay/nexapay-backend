import { currencyService } from "./currency.service";
import { DEFAULT_WALLET_ID, walletRepository } from "../data/wallet.store";
import { Transaction, WalletRepository } from "../types/wallet.types";
import { AppError } from "../utils/appError";

const validateAmount = (amount: unknown): number => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError("El monto debe ser un número mayor a cero", 400);
  }
  return amount;
};

export const createTransactionService = (repo: WalletRepository) => ({
  // Ingreso: suma dinero a una moneda.
  async deposit(
    currency: string,
    amount: unknown,
    description?: string,
    walletId: string = DEFAULT_WALLET_ID
  ): Promise<Transaction> {
    if (!currencyService.isSupported(currency)) {
      throw new AppError("Moneda no soportada", 400);
    }
    const value = validateAmount(amount);

    const balance = await repo.getBalance(walletId, currency);
    await repo.setBalance(walletId, currency, (balance?.amount ?? 0) + value);

    return repo.saveTransaction({
      walletId,
      type: "deposit",
      currencyFrom: currency,
      currencyTo: currency,
      amountFrom: value,
      amountTo: value,
      rateUsed: 1,
      status: "completed",
      description: description ?? "Ingreso simulado",
    });
  },

  // Conversión: resta de una moneda y suma en otra usando la tasa vigente.
  async convert(
    from: string,
    to: string,
    amount: unknown,
    description?: string,
    walletId: string = DEFAULT_WALLET_ID
  ): Promise<Transaction> {
    if (!currencyService.isSupported(from) || !currencyService.isSupported(to)) {
      throw new AppError("Moneda no soportada", 400);
    }
    if (from === to) {
      throw new AppError("Las monedas deben ser distintas", 400);
    }
    const value = validateAmount(amount);

    const source = await repo.getBalance(walletId, from);
    if (!source || source.amount < value) {
      throw new AppError("Saldo insuficiente", 400);
    }

    const conversion = currencyService.convert(value, from, to);
    const target = await repo.getBalance(walletId, to);

    await repo.setBalance(walletId, from, source.amount - value);
    await repo.setBalance(walletId, to, (target?.amount ?? 0) + conversion.result);

    return repo.saveTransaction({
      walletId,
      type: "convert",
      currencyFrom: from,
      currencyTo: to,
      amountFrom: value,
      amountTo: conversion.result,
      rateUsed: conversion.rate,
      status: "completed",
      description,
    });
  },

  // Historial: las operaciones más recientes primero.
  async getHistory(
    limit: number = 20,
    walletId: string = DEFAULT_WALLET_ID
  ): Promise<Transaction[]> {
    return repo.getTransactions(walletId, limit);
  },
});

export const transactionService = createTransactionService(walletRepository);