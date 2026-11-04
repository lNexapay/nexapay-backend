-- Migración 012: comisión cobrada por operación.
-- fee_amount queda en 0 para las operaciones sin comisión.

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_currency VARCHAR(10);

ALTER TABLE transactions
ADD CONSTRAINT transactions_fee_amount_non_negative
CHECK (fee_amount >= 0);