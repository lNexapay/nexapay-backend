
/**
 * Servicio de autenticación de NEXAPAY.
 * Gestiona el registro de usuarios, protege contraseñas
 * y crea automáticamente su billetera con balances en PostgreSQL.
 *
 * Cada usuario tiene un número de cuenta NEXAPAY
 * aleatorio, único y de 8 dígitos.
 */

import bcrypt from "bcrypt";
import pool from "../config/database";
import jwt from "jsonwebtoken";
import { createRefreshSession } from "./refresh-token.service";

// Cantidad máxima de intentos ante una colisión
// del número de cuenta generado por PostgreSQL.
const MAX_ACCOUNT_NUMBER_RETRIES = 5;

// Registrar un nuevo usuario.
export const registerUser = async (
    name: string,
    email: string,
    password: string
) => {
    // Generar el hash una sola vez, fuera de los reintentos.
    const passwordHash = await bcrypt.hash(password, 12);

    for (
        let attempt = 1;
        attempt <= MAX_ACCOUNT_NUMBER_RETRIES;
        attempt++
    ) {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Comprobar si el email ya existe.
            const existingUser = await client.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            );

            if (existingUser.rows.length > 0) {
                throw new Error("El email ya está registrado");
            }

            // Crear el usuario.
            // PostgreSQL genera account_number automáticamente.
            const result = await client.query(
                `INSERT INTO users (name, email, password_hash)
                 VALUES ($1, $2, $3)
                 RETURNING
                    id,
                    name,
                    email,
                    account_number,
                    created_at`,
                [name, email, passwordHash]
            );

            const user = result.rows[0];

            // Crear la billetera y obtener su ID real.
            const walletResult = await client.query(
                `INSERT INTO wallets (user_id)
                 VALUES ($1)
                 RETURNING id`,
                [user.id]
            );

            const walletId = walletResult.rows[0].id;

            // Inicializar las cuatro monedas con saldo cero.
            await client.query(
                `INSERT INTO balances (
                    wallet_id,
                    currency_code,
                    amount
                )
                VALUES
                    ($1, 'ARS', 0),
                    ($1, 'USD', 0),
                    ($1, 'EUR', 0),
                    ($1, 'COP', 0)`,
                [walletId]
            );

            // Confirmar usuario, billetera y balances juntos.
            await client.query("COMMIT");

            return user;

        } catch (error: unknown) {
            // Revertir la transacción completa si algo falla.
            await client.query("ROLLBACK");

            // PostgreSQL: 23505 = violación de UNIQUE.
            const pgError = error as {
                code?: string;
                constraint?: string;
            };

            const isAccountNumberCollision =
                pgError.code === "23505" &&
                pgError.constraint ===
                "users_account_number_unique";

            // Reintentar únicamente si hubo una colisión
            // del número de cuenta NEXAPAY.
            if (
                isAccountNumberCollision &&
                attempt < MAX_ACCOUNT_NUMBER_RETRIES
            ) {
                continue;
            }

            // Si se agotaron los intentos, devolver un error.
            if (isAccountNumberCollision) {
                throw new Error(
                    "No se pudo generar un número de cuenta único. Intentá nuevamente."
                );
            }

            // Mantener el tratamiento habitual de errores.
            throw error;

        } finally {
            // Liberar siempre la conexión al pool.
            client.release();
        }
    }

    throw new Error(
        "No se pudo completar el registro del usuario."
    );
};

// Iniciar sesión.
export const loginUser = async (
    email: string,
    password: string
) => {
    // Buscar al usuario por su email.
    const result = await pool.query(
        `SELECT
            id,
            name,
            email,
            account_number,
            password_hash
         FROM users
         WHERE email = $1`,
        [email]
    );

    const user = result.rows[0];

    if (!user) {
        throw new Error("Credenciales incorrectas");
    }

    // Comprobar la contraseña.
    const validPassword = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!validPassword) {
        throw new Error("Credenciales incorrectas");
    }

    // Obtener la clave secreta del servidor.
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error("JWT_SECRET no está configurado");
    }

    // Generar un access token válido durante 15 minutos.
    const token = jwt.sign(
        { userId: user.id },
        jwtSecret,
        { expiresIn: "15m" }
    );

    // Crear la sesión de renovación después
    // de verificar las credenciales.
    const refreshToken = await createRefreshSession(user.id);

    return {
        token,
        refreshToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            account_number: user.account_number
        }
    };
};

// Obtener un usuario mediante su ID.
export const getUserById = async (userId: string) => {
    const result = await pool.query(
        `SELECT
            id,
            name,
            email,
            account_number,
            created_at
         FROM users
         WHERE id = $1`,
        [userId]
    );

    return result.rows[0] ?? null;
};
