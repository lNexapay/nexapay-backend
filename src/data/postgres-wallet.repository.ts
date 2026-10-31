
/**
 * Repositorio PostgreSQL de NEXAPAY.
 *
 * Permite consultar los balances y movimientos
 * de una billetera directamente desde la base de datos.
 */

import pool from "../config/database";
import {
    Balance,
    CurrencyCode,
    Transaction,
} from "../types/wallet.types";
import { AppError } from "../utils/appError";

// Convierte una fila de PostgreSQL al formato Balance.
// PostgreSQL devuelve los campos DECIMAL como strings.
const mapBalance = (row: any): Balance => ({
    id: row.id,
    walletId: row.wallet_id,
    currencyCode: row.currency_code,
    amount: Number(row.amount),
    updatedAt: row.updated_at,
});

// Convierte una fila de PostgreSQL al formato Transaction.
const mapTransaction = (row: any): Transaction => ({
    id: row.id,
    walletId: row.wallet_id,
    contextId: row.context_id ?? undefined,
    type: row.type,
    currencyFrom: row.currency_from,
    currencyTo: row.currency_to,
    amountFrom: Number(row.amount_from),
    amountTo: Number(row.amount_to),
    rateUsed: Number(row.rate_used),
    status: row.status,
    description: row.description ?? undefined,
    createdAt: row.created_at,
});

export const postgresWalletRepository = {
    /**
     * Obtiene todos los balances de una billetera.
     */
    async getBalances(walletId: string): Promise<Balance[]> {
        const result = await pool.query(
            `SELECT id, wallet_id, currency_code, amount, updated_at
       FROM balances
       WHERE wallet_id = $1
       ORDER BY currency_code`,
            [walletId]
        );

        return result.rows.map(mapBalance);
    },

    /**
     * Obtiene el balance de una moneda específica.
     */
    async getBalance(
        walletId: string,
        currency: CurrencyCode
    ): Promise<Balance | null> {
        const result = await pool.query(
            `SELECT id, wallet_id, currency_code, amount, updated_at
       FROM balances
       WHERE wallet_id = $1
         AND currency_code = $2`,
            [walletId, currency]
        );

        return result.rows[0]
            ? mapBalance(result.rows[0])
            : null;
    },

    /**
     * Obtiene el historial de movimientos de una billetera.
     */
    async getTransactions(
        walletId: string,
        limit: number = 20
    ): Promise<Transaction[]> {
        // Evitar límites negativos, decimales o excesivos.
        const safeLimit = Number.isFinite(limit)
            ? Math.max(1, Math.min(Math.trunc(limit), 100))
            : 20;

        const result = await pool.query(
            `SELECT
         id,
         wallet_id,
         context_id,
         type,
         currency_from,
         currency_to,
         amount_from,
         amount_to,
         rate_used,
         status,
         description,
         created_at
       FROM transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
            [walletId, safeLimit]
        );

        return result.rows.map(mapTransaction);
    },

    /**
     * Registra un depósito de forma atómica.
     *
     * El saldo y la transacción se guardan juntos.
     * Si ocurre un error, se revierten ambos cambios.
     */
    async depositAtomic(
        walletId: string,
        currency: CurrencyCode,
        amount: number,
        description?: string
    ): Promise<Transaction> {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Bloquear la billetera para evitar operaciones
            // simultáneas que puedan alterar incorrectamente el saldo.
            const walletResult = await client.query(
                `SELECT id
       FROM wallets
       WHERE id = $1
       FOR UPDATE`,
                [walletId]
            );

            if (walletResult.rows.length === 0) {
                throw new AppError("Billetera no encontrada", 404);
            }

            // Sumar el depósito al balance correspondiente.
            const balanceResult = await client.query(
                `UPDATE balances
       SET amount = amount + $3,
           updated_at = NOW()
       WHERE wallet_id = $1
         AND currency_code = $2
       RETURNING id`,
                [walletId, currency, amount]
            );

            if (balanceResult.rows.length === 0) {
                throw new AppError("Balance no encontrado", 404);
            }

            // Registrar el movimiento en el historial.
            const transactionResult = await client.query(
                `INSERT INTO transactions (
         wallet_id,
         type,
         currency_from,
         currency_to,
         amount_from,
         amount_to,
         rate_used,
         status,
         description
       )
       VALUES (
         $1, 'deposit', $2, $2,
         $3, $3, 1, 'completed', $4
       )
       RETURNING *`,
                [
                    walletId,
                    currency,
                    amount,
                    description ?? "Ingreso simulado"
                ]
            );

            // Confirmar el saldo y la transacción juntos.
            await client.query("COMMIT");

            return mapTransaction(transactionResult.rows[0]);

        } catch (error) {
            // Revertir cualquier modificación si algo falla.
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }
    },

    /**
     * Convierte dinero entre dos monedas de forma atómica.
     *
     * - Bloquea la billetera durante la operación.
     * - Comprueba que exista saldo suficiente.
     * - Descuenta la moneda de origen.
     * - Acredita la moneda de destino.
     * - Registra la transacción.
     *
     * Si algo falla, revierte todos los cambios.
     */
    async convertAtomic(
        walletId: string,
        from: CurrencyCode,
        to: CurrencyCode,
        amount: number,
        convertedAmount: number,
        rate: number,
        description?: string
    ): Promise<Transaction> {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Bloquear la billetera para serializar sus operaciones.
            const walletResult = await client.query(
                `SELECT id
       FROM wallets
       WHERE id = $1
       FOR UPDATE`,
                [walletId]
            );

            if (walletResult.rows.length === 0) {
                throw new AppError("Billetera no encontrada", 404);
            }

            // Descontar únicamente si existe saldo suficiente.
            const sourceResult = await client.query(
                `UPDATE balances
       SET amount = amount - $3,
           updated_at = NOW()
       WHERE wallet_id = $1
         AND currency_code = $2
         AND amount >= $3
       RETURNING id`,
                [walletId, from, amount]
            );

            if (sourceResult.rows.length === 0) {
                throw new AppError("Saldo insuficiente", 400);
            }

            // Acreditar el dinero convertido en la moneda destino.
            const targetResult = await client.query(
                `UPDATE balances
       SET amount = amount + $3,
           updated_at = NOW()
       WHERE wallet_id = $1
         AND currency_code = $2
       RETURNING id`,
                [walletId, to, convertedAmount]
            );

            if (targetResult.rows.length === 0) {
                throw new AppError("Balance de destino no encontrado", 404);
            }

            // Guardar el movimiento en el historial.
            const transactionResult = await client.query(
                `INSERT INTO transactions (
         wallet_id,
         type,
         currency_from,
         currency_to,
         amount_from,
         amount_to,
         rate_used,
         status,
         description
       )
       VALUES (
         $1, 'convert', $2, $3,
         $4, $5, $6, 'completed', $7
       )
       RETURNING *`,
                [
                    walletId,
                    from,
                    to,
                    amount,
                    convertedAmount,
                    rate,
                    description ?? null
                ]
            );

            // Confirmar los dos balances y el historial juntos.
            await client.query("COMMIT");

            return mapTransaction(transactionResult.rows[0]);

        } catch (error) {
            // Si falla cualquier operación, revertir todo.
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }
    },

    /**
     * Transfiere dinero entre dos billeteras de forma atómica.
     *
     * - Bloquea ambas billeteras en orden fijo (evita bloqueos cruzados).
     * - Descuenta al emisor solo si tiene saldo suficiente.
     * - Acredita al destinatario (crea el saldo si aún no existe).
     * - Registra un movimiento por cada lado.
     *
     * Devuelve el movimiento del emisor. Si algo falla, revierte todo.
     */
    async transferAtomic(
        fromWalletId: string,
        toWalletId: string,
        currency: CurrencyCode,
        amount: number,
        sentDescription: string,
        receivedDescription: string
    ): Promise<Transaction> {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Bloquear las dos billeteras siempre en el mismo orden.
            const wallets = await client.query(
                `SELECT id
       FROM wallets
       WHERE id = ANY($1::uuid[])
       ORDER BY id
       FOR UPDATE`,
                [[fromWalletId, toWalletId]]
            );

            if (wallets.rows.length !== 2) {
                throw new AppError("Billetera no encontrada", 404);
            }

            // Descontar al emisor solo si tiene saldo suficiente.
            const debit = await client.query(
                `UPDATE balances
       SET amount = amount - $3,
           updated_at = NOW()
       WHERE wallet_id = $1
         AND currency_code = $2
         AND amount >= $3
       RETURNING id`,
                [fromWalletId, currency, amount]
            );

            if (debit.rows.length === 0) {
                throw new AppError("Saldo insuficiente", 400);
            }

            // Acreditar al destinatario; si no tiene esa moneda, se crea.
            await client.query(
                `INSERT INTO balances (wallet_id, currency_code, amount)
       VALUES ($1, $2, $3)
       ON CONFLICT (wallet_id, currency_code)
       DO UPDATE SET amount = balances.amount + EXCLUDED.amount,
                     updated_at = NOW()`,
                [toWalletId, currency, amount]
            );

            // Movimiento del emisor.
            const sent = await client.query(
                `INSERT INTO transactions (
         wallet_id, type, currency_from, currency_to,
         amount_from, amount_to, rate_used, status, description
       )
       VALUES (
         $1, 'transfer_out', $2, $2,
         $3, $3, 1, 'completed', $4
       )
       RETURNING *`,
                [fromWalletId, currency, amount, sentDescription]
            );

            // Movimiento del destinatario.
            await client.query(
                `INSERT INTO transactions (
         wallet_id, type, currency_from, currency_to,
         amount_from, amount_to, rate_used, status, description
       )
       VALUES (
         $1, 'transfer_in', $2, $2,
         $3, $3, 1, 'completed', $4
       )`,
                [toWalletId, currency, amount, receivedDescription]
            );

            await client.query("COMMIT");

            return mapTransaction(sent.rows[0]);

        } catch (error) {
            await client.query("ROLLBACK");
            throw error;

        } finally {
            client.release();
        }
    },

};
