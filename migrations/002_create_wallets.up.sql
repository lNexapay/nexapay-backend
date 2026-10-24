
-- Migración 002: crear la tabla de billeteras.
-- Cada usuario de NEXAPAY tiene una única billetera,
-- que posteriormente almacenará saldos en distintas monedas.

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
