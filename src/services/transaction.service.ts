
import { walletRepository, DEFAULT_WALLET_ID } from "../data/wallet.store";
import { currencyService } from "./currency.service";
import { AppError } from "../utils/appError";
import {
  CurrencyCode,
  Transaction,
  WalletRepository,
} from "../types/wallet.types";
import { postgresWalletRepository } from "../data/postgres-wallet.repository";
import { findWalletIdByRecipient } from "./recipient.service";

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
 * Dado el texto que escribió el usuario (correo o número de cuenta),
 * devuelve el id de la billetera del destinatario, o null si no existe.
 */
export type RecipientResolver = (
  recipient: string
) => Promise<string | null>;

/**
 * Crea el servicio con un repositorio específico.
 *
 * Permite utilizar el repositorio en memoria
 * o el repositorio PostgreSQL.
 */
export const createTransactionService = (
  repo: WalletRepository,
  resolveRecipient: RecipientResolver = async () => null
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
     * Transfiere dinero a otro usuario.
     *
     * Cada billetera registra su propio movimiento:
     * transfer_out para quien envía y transfer_in para quien recibe.
     * Devuelve el movimiento del emisor.
     */
    async transfer(
      toAlias: unknown,
      currency: CurrencyCode,
      amount: number,
      description?: string,
      fromWalletId: string = DEFAULT_WALLET_ID
    ): Promise<Transaction> {
      if (typeof toAlias !== "string" || !toAlias.trim()) {
        throw new AppError(
          "El alias del destinatario es obligatorio",
          400
        );
      }

      if (!currencyService.isSupported(currency)) {
        throw new AppError("Moneda no soportada", 400);
      }

      validateAmount(amount);

      const alias = toAlias.trim().toLowerCase();

      const toWalletId = await resolveRecipient(alias);

      if (!toWalletId) {
        throw new AppError("Destinatario no encontrado", 404);
      }

      if (toWalletId === fromWalletId) {
        throw new AppError(
          "No puedes transferirte a ti mismo",
          400
        );
      }

      const sentDescription =
        description ?? `Transferencia a ${alias}`;
      const receivedDescription =
        description ?? "Transferencia recibida";

      // PostgreSQL: operación atómica.
      if (repo.transferAtomic) {
        return repo.transferAtomic(
          fromWalletId,
          toWalletId,
          currency,
          amount,
          sentDescription,
          receivedDescription
        );
      }

      // Repositorio en memoria: si algo falla, se restaura todo.
      if (
        !repo.withTransaction ||
        !repo.setBalance ||
        !repo.saveTransaction
      ) {
        throw new AppError(
          "El repositorio no admite esta operación",
          500
        );
      }

      return repo.withTransaction(async (tx) => {
        const source = await tx.getBalance(
          fromWalletId,
          currency
        );

        if (!source || source.amount < amount) {
          throw new AppError("Saldo insuficiente", 400);
        }

        const target = await tx.getBalance(
          toWalletId,
          currency
        );

        await tx.setBalance!(
          fromWalletId,
          currency,
          round2(source.amount - amount)
        );

        await tx.setBalance!(
          toWalletId,
          currency,
          round2((target?.amount ?? 0) + amount)
        );

        // Una fila para cada lado: cada billetera ve su movimiento.
        const sent = await tx.saveTransaction!({
          walletId: fromWalletId,
          counterpartyWalletId: toWalletId,
          type: "transfer_out",
          currencyFrom: currency,
          currencyTo: currency,
          amountFrom: amount,
          amountTo: amount,
          rateUsed: 1,
          status: "completed",
          description: sentDescription,
        });

        await tx.saveTransaction!({
          walletId: toWalletId,
          counterpartyWalletId: fromWalletId,
          type: "transfer_in",
          currencyFrom: currency,
          currencyTo: currency,
          amountFrom: amount,
          amountTo: amount,
          rateUsed: 1,
          status: "completed",
          description: receivedDescription,
        });

        return sent;
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
    : postgresWalletRepository,
  findWalletIdByRecipient
);
