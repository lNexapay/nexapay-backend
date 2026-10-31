
-- Migración 011: número de cuenta NEXAPAY.
-- Identificador interno aleatorio de 8 dígitos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Generar un número aleatorio de 8 dígitos.
CREATE OR REPLACE FUNCTION nexapay_random_account_number()
RETURNS VARCHAR(8)
LANGUAGE plpgsql
AS $$
DECLARE
    random_bytes BYTEA;
    random_value BIGINT;
BEGIN
    LOOP
        random_bytes := gen_random_bytes(4);

        random_value :=
            get_byte(random_bytes, 0)::BIGINT * 16777216 +
            get_byte(random_bytes, 1)::BIGINT * 65536 +
            get_byte(random_bytes, 2)::BIGINT * 256 +
            get_byte(random_bytes, 3)::BIGINT;

        -- Evitar sesgo por la operación módulo.
        IF random_value < 4230000000 THEN
            RETURN (
                10000000 + random_value % 90000000
            )::VARCHAR(8);
        END IF;
    END LOOP;
END;
$$;

-- Agregar la columna.
ALTER TABLE users
ADD COLUMN account_number VARCHAR(8);

-- Asignar números únicos a los usuarios existentes.
DO $$
DECLARE
    current_user_id UUID;
    candidate VARCHAR(8);
BEGIN
    FOR current_user_id IN
        SELECT id FROM users ORDER BY id
    LOOP
        LOOP
            candidate := nexapay_random_account_number();

            EXIT WHEN NOT EXISTS (
                SELECT 1
                FROM users
                WHERE account_number = candidate
            );
        END LOOP;

        UPDATE users
        SET account_number = candidate
        WHERE id = current_user_id;
    END LOOP;
END;
$$;

-- Proteger la unicidad y el formato.
ALTER TABLE users
ADD CONSTRAINT users_account_number_unique
UNIQUE (account_number);

ALTER TABLE users
ADD CONSTRAINT users_account_number_format
CHECK (account_number ~ '^[0-9]{8}$');

ALTER TABLE users
ALTER COLUMN account_number SET NOT NULL;

-- Generar automáticamente para futuros usuarios.
ALTER TABLE users
ALTER COLUMN account_number
SET DEFAULT nexapay_random_account_number();
