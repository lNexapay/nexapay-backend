import { currencyService } from "./currency.service";
import { DEFAULT_WALLET_ID, walletRepository } from "../data/wallet.store";
import { Transaction, WalletRepository } from "../types/wallet.types";
import { AppError } from "../utils/appError";
import { findWalletIdByRecipient } from "./recipient.service";

// Tope por operación: evita montos absurdos y desbordes de precisión.
export const MAX_AMOUNT = 1_000_000_000_000;

const validateAmount = (amount: unknown): number => {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new AppError("El monto debe ser un número mayor a cero", 400);
  }
  if (amount > MAX_AMOUNT) {
    throw new AppError("El monto excede el máximo permitido", 400);
  }
  return amount;
};

// Dado el alias que escribió el usuario, devuelve el id de wallet del destinatario.
export type RecipientResolver = (alias: string) => Promise<string | null>;

export const createTransactionService = (
  repo: WalletRepository,
  resolveRecipient: RecipientResolver = async () => null
) => ({
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

  // Transferencia: mueve dinero de la wallet emisora a la del destinatario.
  async transfer(
    toAlias: unknown,
    currency: string,
    amount: unknown,
    description?: string,
    fromWalletId: string = DEFAULT_WALLET_ID
  ): Promise<Transaction> {
    if (typeof toAlias !== "string" || !toAlias.trim()) {
      throw new AppError("El alias del destinatario es obligatorio", 400);
    }
    if (!currencyService.isSupported(currency)) {
      throw new AppError("Moneda no soportada", 400);
    }
    const value = validateAmount(amount);
    const alias = toAlias.trim().toLowerCase();

    // Todo dentro de una transacción: si algo falla, no queda nada a medias.
    return repo.withTransaction(async (tx) => {
      const toWalletId = await resolveRecipient(alias);
      if (!toWalletId) {
        throw new AppError("Destinatario no encontrado", 404);
      }
      if (toWalletId === fromWalletId) {
        throw new AppError("No puedes transferirte a ti mismo", 400);
      }

      const source = await tx.getBalance(fromWalletId, currency);
      if (!source || source.amount < value) {
        throw new AppError("Saldo insuficiente", 400);
      }
      const target = await tx.getBalance(toWalletId, currency);

      await tx.setBalance(fromWalletId, currency, source.amount - value);
      await tx.setBalance(toWalletId, currency, (target?.amount ?? 0) + value);

      // Una fila para cada lado: cada wallet ve su propio movimiento.
      const sent = await tx.saveTransaction({
        walletId: fromWalletId,
        counterpartyWalletId: toWalletId,
        type: "transfer_out",
        currencyFrom: currency,
        currencyTo: currency,
        amountFrom: value,
        amountTo: value,
        rateUsed: 1,
        status: "completed",
        description: description ?? `Transferencia a ${alias}`,
      });

      await tx.saveTransaction({
        walletId: toWalletId,
        counterpartyWalletId: fromWalletId,
        type: "transfer_in",
        currencyFrom: currency,
        currencyTo: currency,
        amountFrom: value,
        amountTo: value,
        rateUsed: 1,
        status: "completed",
        description: description ?? "Transferencia recibida",
      });

      return sent;
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

// Mientras no haya un resolvedor real, ninguna transferencia encuentra destinatario.
export const transactionService = createTransactionService(
  walletRepository,
  findWalletIdByRecipient
);