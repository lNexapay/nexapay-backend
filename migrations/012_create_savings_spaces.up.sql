
-- Migración 012: crear espacios de ahorro y sus movimientos.
-- Cada espacio pertenece a una billetera y utiliza una sola moneda.

CREATE TABLE savings_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wallet_id UUID NOT NULL
        REFERENCES wallets(id),

    name VARCHAR(100) NOT NULL,

    currency_code VARCHAR(10) NOT NULL,

    target_amount DECIMAL(18, 2),

    amount DECIMAL(18, 2) NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT savings_spaces_name_not_empty
        CHECK (LENGTH(TRIM(name)) > 0),

    CONSTRAINT savings_spaces_currency_valid
        CHECK (currency_code IN ('ARS', 'USD', 'EUR', 'COP')),

    CONSTRAINT savings_spaces_target_positive
        CHECK (target_amount IS NULL OR target_amount > 0),

    CONSTRAINT savings_spaces_amount_nonnegative
        CHECK (amount >= 0)
);

-- Permite consultar rápidamente los espacios de una billetera.
CREATE INDEX idx_savings_spaces_wallet_id
    ON savings_spaces(wallet_id);


-- Historial de aportes y retiros de cada espacio.
CREATE TABLE savings_space_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    space_id UUID NOT NULL
        REFERENCES savings_spaces(id),

    type VARCHAR(10) NOT NULL,

    amount DECIMAL(18, 2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT savings_space_movements_type_valid
        CHECK (type IN ('deposit', 'withdraw')),

    CONSTRAINT savings_space_movements_amount_positive
        CHECK (amount > 0)
);

-- Optimiza la consulta del historial de un espacio.
CREATE INDEX idx_savings_space_movements_space_created
    ON savings_space_movements(space_id, created_at DESC);
