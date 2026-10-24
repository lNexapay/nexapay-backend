/**
 * Servicio de refresh tokens de NEXAPAY.
 * Genera tokens aleatorios seguros y calcula sus hashes
 * para evitar almacenar los tokens originales.
 */

import { randomBytes, createHash } from "node:crypto";
import pool from "../config/database";

// Generar un refresh token aleatorio.
export const generateRefreshToken = (): string => {
    return randomBytes(32).toString("hex");
};

// Calcular el hash de un refresh token.
export const hashRefreshToken = (token: string): string => {
    return createHash("sha256")
        .update(token)
        .digest("hex");
};
export const createRefreshSession = async (userId: string) => {
    // Generar un token aleatorio.
    const refreshToken = generateRefreshToken();

    // Calcular su hash.
    const tokenHash = hashRefreshToken(refreshToken);

    const expiresAt = new Date();

    // El refresh token vence 24 horas después de crearse.
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Guardar la sesión en PostgreSQL.
    await pool.query(
        `INSERT INTO refresh_tokens
         (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
    );

    // Devolver el token original.
    return refreshToken;
};
export const validateRefreshToken = async (refreshToken: string) => {
    const tokenHash = hashRefreshToken(refreshToken);

    const result = await pool.query(
        `SELECT user_id
     FROM refresh_tokens
     WHERE token_hash = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL
       AND last_activity_at > NOW() - INTERVAL '15 minutes'`,
        [tokenHash]
    );

    return result.rows[0] ?? null;
};
export const revokeRefreshToken = async (refreshToken: string) => {
    const tokenHash = hashRefreshToken(refreshToken);

    await pool.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW()
         WHERE token_hash = $1
           AND revoked_at IS NULL`,
        [tokenHash]
    );
};
export const updateSessionActivity = async (refreshToken: string) => {
    const tokenHash = hashRefreshToken(refreshToken);

    const result = await pool.query(
        `UPDATE refresh_tokens
         SET last_activity_at = NOW()
         WHERE token_hash = $1
           AND expires_at > NOW()
           AND revoked_at IS NULL
           AND last_activity_at > NOW() - INTERVAL '15 minutes'
         RETURNING user_id`,
        [tokenHash]
    );

    return result.rows[0] ?? null;
};