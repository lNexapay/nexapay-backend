
import { walletRepository, DEFAULT_WALLET_ID } from "../data/wallet.store";
import { currencyService } from "./currency.service";
import { AppError } from "../utils/appError";
import {
  CurrencyCode,
  Transaction,
  WalletRepository,
} from "../types/wallet.types";
import { postgresWalletRepository } from "../data/postgres-wallet.repository";

// Monto máximo permitido por operación.
export const MAX_AMOUNT = 1_000_000_000_000;

/**
 * Redondea los importes a dos decimales.
 * Coincide con DECIMAL(18,2) de PostgreSQL.
 */
const round2 = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

/**
 * Valida que el monto sea positivo, finito,
 * no supere el máximo y tenga hasta dos decimales.
 */
const validateAmount = (amount: number): void => {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new AppError(
      "El monto debe ser un número mayor a cero",
      400
    );
  }

  if (amount > MAX_AMOUNT) {
    throw new AppError(
      "El monto excede el máximo permitido",
      400
    );
  }

  if (round2(amount) !== amount) {
    throw new AppError(
      "El monto no puede tener más de dos decimales",
      400
    );
  }
};

/**
 * Crea el servicio con un repositorio específico.
 *
 * Permite utilizar el repositorio en memoria
 * o el repositorio PostgreSQL.
 */
export const createTransactionService = (
  repo: WalletRepository
) => {
  /**
   * Comprueba que el repositorio admita
   * escrituras individuales.
   *
   * Estas se utilizan en memoria.
   * PostgreSQL utiliza operaciones atómicas.
   */
  const getMemoryWriter = () => {
    if (!repo.setBalance || !repo.saveTransaction) {
      throw new AppError(
        "El repositorio no admite esta operación",
        500
      );
    }

    return {
      setBalance: repo.setBalance.bind(repo),
      saveTransaction: repo.saveTransaction.bind(repo),
    };
  };

  return {
    /**
     * Registra un depósito.
     *
     * Se conserva el orden de parámetros utilizado
     * por los controladores y las pruebas.
     */
    async deposit(
      currency: CurrencyCode,
      amount: number,
      description?: string,
      walletId: string = DEFAULT_WALLET_ID
    ): Promise<Transaction> {
      if (!currencyService.isSupported(currency)) {
        throw new AppError("Moneda no soportada", 400);
      }

      validateAmount(amount);

      // PostgreSQL: operación atómica.
      if (repo.depositAtomic) {
        return repo.depositAtomic(
          walletId,
          currency,
          amount,
          description
        );
      }

      // Repositorio en memoria.
      const writer = getMemoryWriter();

      const balance = await repo.getBalance(
        walletId,
        currency
      );

      const currentAmount = balance?.amount ?? 0;

      await writer.setBalance(
        walletId,
        currency,
        round2(currentAmount + amount)
      );

      return writer.saveTransaction({
        walletId,
        type: "deposit",
        currencyFrom: currency,
        currencyTo: currency,
        amountFrom: amount,
        amountTo: amount,
        rateUsed: 1,
        status: "completed",
        description: description ?? "Ingreso simulado",
      });
    },

    /**
     * Convierte dinero entre monedas.
     */
    async convert(
      from: CurrencyCode,
      to: CurrencyCode,
      amount: number,
      description?: string,
      walletId: string = DEFAULT_WALLET_ID
    ): Promise<Transaction> {
      if (
        !currencyService.isSupported(from) ||
        !currencyService.isSupported(to)
      ) {
        throw new AppError("Moneda no soportada", 400);
      }

      if (from === to) {
        throw new AppError(
          "Las monedas deben ser distintas",
          400
        );
      }

      validateAmount(amount);

      // Calcular la conversión.
      const conversion = currencyService.convert(
        amount,
        from,
        to
      );

      // Importe exacto que se acreditará.
      const convertedAmount = round2(
        conversion.result
      );

      if (
        !Number.isFinite(convertedAmount) ||
        convertedAmount <= 0 ||
        !Number.isFinite(conversion.rate) ||
        conversion.rate <= 0
      ) {
        throw new AppError(
          "El monto convertido no es válido",
          400
        );
      }

      // PostgreSQL: operación atómica.
      if (repo.convertAtomic) {
        return repo.convertAtomic(
          walletId,
          from,
          to,
          amount,
          convertedAmount,
          conversion.rate,
          description
        );
      }

      // Repositorio en memoria.
      const writer = getMemoryWriter();

      const sourceBalance = await repo.getBalance(
        walletId,
        from
      );

      const available = sourceBalance?.amount ?? 0;

      if (available < amount) {
        throw new AppError(
          "Saldo insuficiente",
          400
        );
      }

      const targetBalance = await repo.getBalance(
        walletId,
        to
      );

      const targetAmount = targetBalance?.amount ?? 0;

      // Descontar la moneda de origen.
      await writer.setBalance(
        walletId,
        from,
        round2(available - amount)
      );

      // Acreditar la moneda de destino.
      await writer.setBalance(
        walletId,
        to,
        round2(targetAmount + convertedAmount)
      );

      // Registrar el movimiento.
      return writer.saveTransaction({
        walletId,
        type: "convert",
        currencyFrom: from,
        currencyTo: to,
        amountFrom: amount,
        amountTo: convertedAmount,
        rateUsed: conversion.rate,
        status: "completed",
        description,
      });
    },

    /**
     * Obtiene el historial de movimientos.
     */
    async getHistory(
      walletId: string = DEFAULT_WALLET_ID,
      limit: number = 20
    ): Promise<Transaction[]> {
      return repo.getTransactions(walletId, limit);
    },
  };
};

/**
 * En las pruebas usamos el repositorio en memoria.
 * En desarrollo y producción utilizamos PostgreSQL.
 */
export const transactionService = createTransactionService(
  process.env.NODE_ENV === "test"
    ? walletRepository
    : postgresWalletRepository
);
