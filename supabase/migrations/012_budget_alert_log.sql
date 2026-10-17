-- 012 — Registro de alertas de presupuesto enviadas (push + Telegram)
--
-- La Edge Function send-budget-alerts avisa cuando un presupuesto llega al 80 %
-- y al 100 % de su límite. Esta tabla evita repetir el mismo aviso: hay como
-- máximo una fila por presupuesto, periodo y umbral.
--
-- La escribe solo la función (service role, que ignora RLS). RLS queda activada
-- sin políticas, así que ningún usuario puede leerla ni modificarla desde la app.

CREATE TABLE budget_alert_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_key  TEXT NOT NULL,                       -- mensual '2026-10' | semanal 'W:2026-10-12' (lunes) | anual '2026'
  threshold   INTEGER NOT NULL CHECK (threshold IN (80, 100)),
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (budget_id, period_key, threshold)
);

CREATE INDEX idx_budget_alert_log_user ON budget_alert_log(user_id);

ALTER TABLE budget_alert_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Cron: revisar presupuestos cada 3 horas. Ejecutar UNA VEZ, después de
-- desplegar la función (`supabase functions deploy send-budget-alerts
-- --no-verify-jwt`), reemplazando <project-ref> y <cron-secret> (el mismo
-- CRON_SECRET que usa send-payment-reminders):
--
-- SELECT cron.schedule(
--   'budget-alerts',
--   '0 */3 * * *',
--   $$ SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/send-budget-alerts',
--     headers := jsonb_build_object('x-cron-secret', '<cron-secret>')
--   ) $$
-- );
-- ============================================================
