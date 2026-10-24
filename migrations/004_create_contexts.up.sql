
-- Migración 004: crear la tabla de contextos.
-- Permite organizar gastos y presupuestos académicos
-- asociados a una billetera de NEXAPAY.

CREATE TABLE contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wallet_id UUID NOT NULL REFERENCES wallets(id),

    name VARCHAR(255) NOT NULL,

    type VARCHAR(100) NOT NULL,

    status VARCHAR(100) NOT NULL DEFAULT 'active',

    start_date DATE,
    end_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_context_dates
        CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
