
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import pool from "../config/database";
import { createRefreshSession } from "./refresh-token.service";

// Cliente encargado de verificar los ID tokens de Google.
const googleClient = new OAuth2Client();

const MAX_ACCOUNT_NUMBER_RETRIES = 5;

export interface GoogleIdentity {
    googleId: string;
    email: string;
    name: string;
}

interface AuthUser {
    id: string;
    name: string;
    email: string;
    account_number: string;
}

// Errores controlados de autenticación.
export class GoogleAuthError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number
    ) {
        super(message);
        this.name = "GoogleAuthError";
    }
}

// Verificar la identidad del usuario mediante Google.
export const verifyGoogleToken = async (
    idToken: string
): Promise<GoogleIdentity> => {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        throw new Error("GOOGLE_CLIENT_ID no está configurado");
    }

    if (typeof idToken !== "string" || !idToken.trim()) {
        throw new GoogleAuthError(
            "Token de Google inválido",
            401
        );
    }

    let ticket;

    try {
        ticket = await googleClient.verifyIdToken({
            idToken,
            audience: clientId
        });
    } catch {
        throw new GoogleAuthError(
            "Token de Google inválido",
            401
        );
    }

    const payload = ticket.getPayload();

    if (
        !payload?.sub ||
        !payload.email ||
        payload.email_verified !== true
    ) {
        throw new GoogleAuthError(
            "Identidad de Google no válida",
            401
        );
    }

    return {
        googleId: payload.sub,
        email: payload.email.trim().toLowerCase(),
        name: payload.name?.trim() ||
            payload.email.split("@")[0]
    };
};

// Iniciar sesión o registrar un usuario mediante Google.
export const loginWithGoogle = async (
    idToken: string
) => {
    // Primero verificar el token con Google.
    const identity = await verifyGoogleToken(idToken);

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error("JWT_SECRET no está configurado");
    }

    let user: AuthUser | undefined;

    for (
        let attempt = 1;
        attempt <= MAX_ACCOUNT_NUMBER_RETRIES;
        attempt++
    ) {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            // Buscar si Google ya está vinculado a un usuario.
            const linked = await client.query<AuthUser>(
                `SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.account_number
                 FROM user_oauth_accounts oa
                 JOIN users u ON u.id = oa.user_id
                 WHERE oa.provider = 'google'
                   AND oa.provider_user_id = $1`,
                [identity.googleId]
            );

            if (linked.rows.length > 0) {
                user = linked.rows[0];

                await client.query("COMMIT");
                break;
            }

            // No vincular automáticamente cuentas por email.
            const existing = await client.query(
                `SELECT id
                 FROM users
                 WHERE LOWER(email) = $1`,
                [identity.email]
            );

            if (existing.rows.length > 0) {
                throw new GoogleAuthError(
                    "Ya existe una cuenta con este correo. Iniciá sesión con tu método habitual.",
                    409
                );
            }

            // Crear usuario sin contraseña local.
            const created = await client.query<AuthUser>(
                `INSERT INTO users (
                    name,
                    email,
                    password_hash
                 )
                 VALUES ($1, $2, NULL)
                 RETURNING
                    id,
                    name,
                    email,
                    account_number`,
                [
                    identity.name,
                    identity.email
                ]
            );

            // Utilizar una variable local para que TypeScript
            // pueda verificar que el usuario existe.
            const newUser = created.rows[0];

            if (!newUser) {
                throw new Error(
                    "No se pudo crear el usuario de Google"
                );
            }

            // Vincular la identidad permanente de Google.
            await client.query(
                `INSERT INTO user_oauth_accounts (
                    user_id,
                    provider,
                    provider_user_id
                 )
                 VALUES ($1, 'google', $2)`,
                [
                    newUser.id,
                    identity.googleId
                ]
            );

            // Crear la billetera del usuario.
            const walletResult = await client.query<{
                id: string;
            }>(
                `INSERT INTO wallets (user_id)
                 VALUES ($1)
                 RETURNING id`,
                [newUser.id]
            );

            const wallet = walletResult.rows[0];

            if (!wallet) {
                throw new Error(
                    "No se pudo crear la billetera"
                );
            }

            // Crear los cuatro balances iniciales.
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
                [wallet.id]
            );

            // Confirmar todas las operaciones.
            await client.query("COMMIT");

            user = newUser;
            break;

        } catch (error: unknown) {
            await client.query("ROLLBACK");

            if (error instanceof GoogleAuthError) {
                throw error;
            }

            const pgError = error as {
                code?: string;
                constraint?: string;
            };

            const isAccountNumberCollision =
                pgError.code === "23505" &&
                pgError.constraint ===
                "users_account_number_unique";

            const isGoogleIdentityCollision =
                pgError.code === "23505" &&
                pgError.constraint ===
                "user_oauth_accounts_provider_unique";

            // Reintentar si hubo una colisión del número
            // de cuenta o un registro simultáneo de Google.
            if (
                (
                    isAccountNumberCollision ||
                    isGoogleIdentityCollision
                ) &&
                attempt < MAX_ACCOUNT_NUMBER_RETRIES
            ) {
                continue;
            }

            // Si otro proceso registró esta misma identidad
            // mientras tanto, recuperar la cuenta existente.
            if (isGoogleIdentityCollision) {
                const linkedAfterConflict =
                    await pool.query<AuthUser>(
                        `SELECT
                            u.id,
                            u.name,
                            u.email,
                            u.account_number
                         FROM user_oauth_accounts oa
                         JOIN users u ON u.id = oa.user_id
                         WHERE oa.provider = 'google'
                           AND oa.provider_user_id = $1`,
                        [identity.googleId]
                    );

                if (linkedAfterConflict.rows[0]) {
                    user = linkedAfterConflict.rows[0];
                    break;
                }
            }

            if (isAccountNumberCollision) {
                throw new Error(
                    "No se pudo generar un número de cuenta único"
                );
            }

            // Evitar duplicados cuando dos solicitudes
            // intentan registrar el mismo email.
            if (pgError.code === "23505") {
                throw new GoogleAuthError(
                    "Ya existe una cuenta con este correo.",
                    409
                );
            }

            throw error;

        } finally {
            client.release();
        }
    }

    if (!user) {
        throw new Error(
            "No se pudo completar el acceso con Google"
        );
    }

    // Generar el JWT de NEXAPAY (15 minutos).
    const token = jwt.sign(
        { userId: user.id },
        jwtSecret,
        { expiresIn: "15m" }
    );

    // Crear la sesión refresh en PostgreSQL.
    const refreshToken = await createRefreshSession(
        user.id
    );

    // Devolver los datos que espera el controlador.
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
