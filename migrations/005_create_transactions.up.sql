
-- Migración 005: crear la tabla de transacciones.
-- Registra las operaciones de compra, venta y conversión
-- de monedas realizadas dentro de una billetera NEXAPAY.

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wallet_id UUID NOT NULL REFERENCES wallets(id),

    context_id UUID REFERENCES contexts(id),

    type VARCHAR(100) NOT NULL,

    currency_from VARCHAR(10) NOT NULL,
    currency_to VARCHAR(10) NOT NULL,

    amount_from DECIMAL(18, 2) NOT NULL,
    amount_to DECIMAL(18, 2) NOT NULL,

    rate_used DECIMAL(20, 8) NOT NULL,

    status VARCHAR(100) NOT NULL DEFAULT 'completed',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT positive_transaction_amounts
        CHECK (amount_from > 0 AND amount_to > 0)
);
