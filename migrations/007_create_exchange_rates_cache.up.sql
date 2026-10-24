
-- Migración 007: crear la caché de cotizaciones.
-- Almacena temporalmente los tipos de cambio obtenidos
-- de APIs externas para evitar consultas innecesarias.

CREATE TABLE exchange_rates_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    currency_from VARCHAR(10) NOT NULL,
    currency_to VARCHAR(10) NOT NULL,

    rate DECIMAL(20, 8) NOT NULL,

    source VARCHAR(255) NOT NULL,

    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,

    CONSTRAINT positive_exchange_rate
        CHECK (rate > 0),

    CONSTRAINT valid_exchange_rate_dates
        CHECK (valid_until > fetched_at),

    CONSTRAINT unique_currency_pair
        UNIQUE (currency_from, currency_to)
);
