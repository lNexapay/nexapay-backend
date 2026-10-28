
/**
 * Servicio de autenticación de NEXAPAY.
 * Gestiona el registro de usuarios, protege contraseñas
 * y crea automáticamente su billetera con balances en PostgreSQL.
 */

import bcrypt from "bcrypt";
import pool from "../config/database";
import jwt from "jsonwebtoken";
import { createRefreshSession } from "./refresh-token.service";

// Registrar un nuevo usuario.
export const registerUser = async (
    name: string,
    email: string,
    password: string
) => {
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

        // Proteger la contraseña.
        const passwordHash = await bcrypt.hash(password, 12);

        // Crear el usuario.
        const result = await client.query(
            `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
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
            `INSERT INTO balances (wallet_id, currency_code, amount)
       VALUES
         ($1, 'ARS', 0),
         ($1, 'USD', 0),
         ($1, 'EUR', 0),
         ($1, 'COP', 0)`,
            [walletId]
        );

        // Confirmar todo junto: usuario, billetera y balances.
        await client.query("COMMIT");

        return user;

    } catch (error) {
        // Si algo falla, revertir todos los cambios.
        await client.query("ROLLBACK");
        throw error;

    } finally {
        // Liberar la conexión al pool.
        client.release();
    }
};

// Iniciar sesión.
export const loginUser = async (
    email: string,
    password: string
) => {
    // Buscar al usuario por su email.
    const result = await pool.query(
        `SELECT id, name, email, password_hash
     FROM users
     WHERE email = $1`,
        [email]
    );

    const user = result.rows[0];

    if (!user) {
        throw new Error("Credenciales incorrectas");
    }

    // Comprobar la contraseña antes de crear una sesión.
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

    // Crear la sesión de renovación solamente después
    // de verificar las credenciales.
    const refreshToken = await createRefreshSession(user.id);

    return {
        token,
        refreshToken,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    };
};

// Obtener un usuario mediante su ID.
export const getUserById = async (userId: string) => {
    const result = await pool.query(
        `SELECT id, name, email, created_at
     FROM users
     WHERE id = $1`,
        [userId]
    );

    return result.rows[0] ?? null;
};
