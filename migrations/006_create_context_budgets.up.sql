
-- Migración 006: crear la tabla de presupuestos.
-- Permite asignar un presupuesto a cada contexto académico
-- para organizar y controlar los gastos del usuario.

CREATE TABLE context_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    context_id UUID NOT NULL UNIQUE REFERENCES contexts(id),

    amount DECIMAL(18, 2) NOT NULL,

    currency_code VARCHAR(10) NOT NULL,

    period_start DATE,
    period_end DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT positive_budget
        CHECK (amount >= 0),

    CONSTRAINT valid_budget_dates
        CHECK (
            period_end IS NULL
            OR period_start IS NULL
            OR period_end >= period_start
        )
);
