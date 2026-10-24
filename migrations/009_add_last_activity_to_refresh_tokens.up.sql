-- Registra la última actividad de cada sesión.
-- Permite bloquear sesiones después de 15 minutos
-- sin actividad del usuario.

ALTER TABLE refresh_tokens
ADD COLUMN last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW();