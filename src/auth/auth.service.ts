
/**
 * Servicio de autenticación de NEXAPAY.
 * Gestiona el registro de usuarios, protege contraseñas
 * y crea automáticamente su billetera en PostgreSQL.
 */

import bcrypt from "bcrypt";
import pool from "../config/database";
import jwt from "jsonwebtoken";


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

        // Crear la billetera del usuario.
        await client.query(
            "INSERT INTO wallets (user_id) VALUES ($1)",
            [user.id]
        );

        await client.query("COMMIT");

        return user;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
};
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

    // Comprobar si el usuario existe.
    if (!user) {
        throw new Error("Credenciales incorrectas");
    }

    // Comparar la contraseña con el hash almacenado.
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

    // Generar el token de autenticación.
    const token = jwt.sign(
        { userId: user.id },
        jwtSecret,
        { expiresIn: "1h" }
    );

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    };
};

export const getUserById = async (userId: string) => {
    const result = await pool.query(
        `SELECT id, name, email, created_at
         FROM users
         WHERE id = $1`,
        [userId]
    );

    return result.rows[0] ?? null;
};