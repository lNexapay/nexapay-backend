-- Migración 010: agregar descripción opcional
-- a las transacciones de NEXAPAY.

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS description TEXT;