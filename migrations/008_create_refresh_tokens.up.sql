-- Almacena las sesiones de renovación de NEXAPAY.
-- Permite renovar tokens, controlar vencimientos
-- y revocar sesiones al cerrar sesión.

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT refresh_tokens_expiration_check
        CHECK (expires_at > created_at)
);

CREATE INDEX idx_refresh_tokens_user_id
    ON refresh_tokens(user_id);