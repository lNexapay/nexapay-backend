
import pool from "../config/database";
import { AppError } from "../utils/appError";

const SUPPORTED_CURRENCIES = ["ARS", "USD", "EUR", "COP"];

const MAX_AMOUNT = 999999999999.99;

// Validar importes monetarios
const validateMoneyAmount = (amount: unknown): string => {
    if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        amount > MAX_AMOUNT
    ) {
        throw new AppError(
            "El importe debe ser un número positivo válido",
            400
        );
    }

    const formattedAmount = amount.toFixed(2);

    if (Number(formattedAmount) !== amount) {
        throw new AppError(
            "El importe debe tener como máximo dos decimales",
            400
        );
    }

    return formattedAmount;
};

// Validar identificadores UUID
const validateSpaceId = (spaceId: string): void => {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(spaceId)) {
        throw new AppError(
            "Identificador de espacio inválido",
            400
        );
    }
};

// Convertir los campos de PostgreSQL al formato de la API
const mapSpace = (row: any) => ({
    id: row.id,
    name: row.name,
    currencyCode: row.currency_code,
    targetAmount:
        row.target_amount === null
            ? null
            : Number(row.target_amount),
    amount: Number(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapMovement = (row: any) => ({
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    createdAt: row.created_at,
});

export const savingsSpaceService = {
    // Crear un nuevo espacio de ahorro
    async create(
        userId: string,
        name: string,
        currencyCode: string,
        targetAmount?: number | null
    ) {
        if (
            typeof name !== "string" ||
            !name.trim() ||
            name.trim().length > 100
        ) {
            throw new AppError(
                "El nombre debe tener entre 1 y 100 caracteres",
                400
            );
        }

        if (!SUPPORTED_CURRENCIES.includes(currencyCode)) {
            throw new AppError("Moneda no soportada", 400);
        }

        const formattedTarget =
            targetAmount === undefined || targetAmount === null
                ? null
                : validateMoneyAmount(targetAmount);

        const result = await pool.query(
            `INSERT INTO savings_spaces (
                wallet_id,
                name,
                currency_code,
                target_amount
            )
            SELECT id, $2, $3, $4
            FROM wallets
            WHERE user_id = $1
            RETURNING *`,
            [
                userId,
                name.trim(),
                currencyCode,
                formattedTarget,
            ]
        );

        if (result.rows.length === 0) {
            throw new AppError("Billetera no encontrada", 404);
        }

        return mapSpace(result.rows[0]);
    },

    // Listar todos los espacios del usuario
    async list(userId: string) {
        const result = await pool.query(
            `SELECT s.*
            FROM savings_spaces s
            JOIN wallets w ON w.id = s.wallet_id
            WHERE w.user_id = $1
            ORDER BY s.created_at DESC, s.id DESC`,
            [userId]
        );

        return result.rows.map(mapSpace);
    },

    // Obtener un espacio específico
    async getById(userId: string, spaceId: string) {
        validateSpaceId(spaceId);

        const result = await pool.query(
            `SELECT s.*
            FROM savings_spaces s
            JOIN wallets w ON w.id = s.wallet_id
            WHERE w.user_id = $1
              AND s.id = $2`,
            [userId, spaceId]
        );

        if (result.rows.length === 0) {
            throw new AppError("Espacio no encontrado", 404);
        }

        return mapSpace(result.rows[0]);
    },

    // Aportar dinero desde la billetera hacia un espacio
    async deposit(
        userId: string,
        spaceId: string,
        amount: number
    ) {
        validateSpaceId(spaceId);

        const formattedAmount = validateMoneyAmount(amount);

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Bloquear la billetera del usuario
            const walletResult = await client.query(
                `SELECT id
                FROM wallets
                WHERE user_id = $1
                FOR UPDATE`,
                [userId]
            );

            if (walletResult.rows.length === 0) {
                throw new AppError(
                    "Billetera no encontrada",
                    404
                );
            }

            const walletId = walletResult.rows[0].id;

            // Verificar que el espacio pertenece al usuario
            const spaceResult = await client.query(
                `SELECT id, currency_code
                FROM savings_spaces
                WHERE id = $1
                  AND wallet_id = $2`,
                [spaceId, walletId]
            );

            if (spaceResult.rows.length === 0) {
                throw new AppError(
                    "Espacio no encontrado",
                    404
                );
            }

            const currency = spaceResult.rows[0].currency_code;

            // Descontar dinero del saldo disponible
            const balanceResult = await client.query(
                `UPDATE balances
                SET amount = amount - $3
                WHERE wallet_id = $1
                  AND currency_code = $2
                  AND amount >= $3
                RETURNING amount`,
                [walletId, currency, formattedAmount]
            );

            if (balanceResult.rows.length === 0) {
                throw new AppError(
                    "Saldo insuficiente",
                    400
                );
            }

            // Acreditar dinero en el espacio
            const updatedSpace = await client.query(
                `UPDATE savings_spaces
                SET amount = amount + $2,
                    updated_at = NOW()
                WHERE id = $1
                  AND wallet_id = $3
                RETURNING *`,
                [spaceId, formattedAmount, walletId]
            );

            if (updatedSpace.rows.length === 0) {
                throw new AppError(
                    "No se pudo actualizar el espacio",
                    404
                );
            }

            // Registrar el aporte
            const movement = await client.query(
                `INSERT INTO savings_space_movements (
                    space_id,
                    type,
                    amount
                )
                VALUES ($1, 'deposit', $2)
                RETURNING id, type, amount, created_at`,
                [spaceId, formattedAmount]
            );

            await client.query("COMMIT");

            return {
                space: mapSpace(updatedSpace.rows[0]),
                availableBalance: Number(
                    balanceResult.rows[0].amount
                ),
                movement: mapMovement(movement.rows[0]),
            };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    // Retirar dinero de un espacio hacia la billetera
    async withdraw(
        userId: string,
        spaceId: string,
        amount: number
    ) {
        validateSpaceId(spaceId);

        const formattedAmount = validateMoneyAmount(amount);

        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Bloquear la billetera del usuario
            const walletResult = await client.query(
                `SELECT id
                FROM wallets
                WHERE user_id = $1
                FOR UPDATE`,
                [userId]
            );

            if (walletResult.rows.length === 0) {
                throw new AppError(
                    "Billetera no encontrada",
                    404
                );
            }

            const walletId = walletResult.rows[0].id;

            // Verificar que el espacio pertenece al usuario
            const spaceResult = await client.query(
                `SELECT id, currency_code
                FROM savings_spaces
                WHERE id = $1
                  AND wallet_id = $2`,
                [spaceId, walletId]
            );

            if (spaceResult.rows.length === 0) {
                throw new AppError(
                    "Espacio no encontrado",
                    404
                );
            }

            const currency = spaceResult.rows[0].currency_code;

            // Descontar dinero del espacio
            const updatedSpace = await client.query(
                `UPDATE savings_spaces
                SET amount = amount - $2,
                    updated_at = NOW()
                WHERE id = $1
                  AND wallet_id = $3
                  AND amount >= $2
                RETURNING *`,
                [spaceId, formattedAmount, walletId]
            );

            if (updatedSpace.rows.length === 0) {
                throw new AppError(
                    "Saldo insuficiente en el espacio",
                    400
                );
            }

            // Devolver dinero al saldo disponible
            const balanceResult = await client.query(
                `UPDATE balances
                SET amount = amount + $3
                WHERE wallet_id = $1
                  AND currency_code = $2
                RETURNING amount`,
                [walletId, currency, formattedAmount]
            );

            if (balanceResult.rows.length === 0) {
                throw new AppError(
                    "Saldo de billetera no encontrado",
                    404
                );
            }

            // Registrar el retiro
            const movement = await client.query(
                `INSERT INTO savings_space_movements (
                    space_id,
                    type,
                    amount
                )
                VALUES ($1, 'withdraw', $2)
                RETURNING id, type, amount, created_at`,
                [spaceId, formattedAmount]
            );

            await client.query("COMMIT");

            return {
                space: mapSpace(updatedSpace.rows[0]),
                availableBalance: Number(
                    balanceResult.rows[0].amount
                ),
                movement: mapMovement(movement.rows[0]),
            };
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        } finally {
            client.release();
        }
    },

    // Obtener el historial de movimientos de un espacio
    async getMovements(userId: string, spaceId: string) {
        validateSpaceId(spaceId);

        // Verificar que el espacio pertenece al usuario
        const spaceResult = await pool.query(
            `SELECT s.id
            FROM savings_spaces s
            JOIN wallets w ON w.id = s.wallet_id
            WHERE s.id = $1
              AND w.user_id = $2`,
            [spaceId, userId]
        );

        if (spaceResult.rows.length === 0) {
            throw new AppError(
                "Espacio no encontrado",
                404
            );
        }

        // Obtener los movimientos, del más reciente al más antiguo
        const result = await pool.query(
            `SELECT id, type, amount, created_at
            FROM savings_space_movements
            WHERE space_id = $1
            ORDER BY created_at DESC, id DESC`,
            [spaceId]
        );

        return result.rows.map(mapMovement);
    },
};
