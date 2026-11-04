-- Migración 014: autenticación mediante Google.

-- Permitir usuarios sin contraseña local.
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

-- Guardar identidades vinculadas a proveedores externos.
CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    provider VARCHAR(30) NOT NULL,

    provider_user_id VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_oauth_accounts_provider_unique
        UNIQUE (provider, provider_user_id),

    CONSTRAINT user_oauth_accounts_user_provider_unique
        UNIQUE (user_id, provider)
);