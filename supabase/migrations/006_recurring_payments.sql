-- ============================================================
-- GodMoney - Migración: Pagos recurrentes obligatorios + alertas
-- multicanal (in-app, push del navegador, Telegram).
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos
-- que ya tiene supabase/schema.sql + migraciones 002-005 aplicadas.
-- ============================================================

-- ============================================================
-- TABLA: recurring_payments (seguro, internet, servicios, etc.)
-- schedule_type FIXED_DAY: vence el mismo día calendario cada mes
-- (due_day_of_month, clampeado al último día si el mes es corto).
-- schedule_type MANUAL: el usuario actualiza next_due_date cada
-- vez que paga (útil para servicios sin día fijo de facturación).
-- ============================================================
CREATE TABLE recurring_payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  description          TEXT,
  amount               DECIMAL(12, 2) CHECK (amount IS NULL OR amount > 0),
  category_id          UUID REFERENCES categories(id) ON DELETE SET NULL,
  schedule_type        TEXT NOT NULL CHECK (schedule_type IN ('FIXED_DAY', 'MANUAL')),
  due_day_of_month     INTEGER CHECK (due_day_of_month BETWEEN 1 AND 31),
  next_due_date        DATE,
  reminder_days_before INTEGER NOT NULL DEFAULT 3 CHECK (reminder_days_before >= 0),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (schedule_type = 'FIXED_DAY' AND due_day_of_month IS NOT NULL AND next_due_date IS NULL) OR
    (schedule_type = 'MANUAL' AND next_due_date IS NOT NULL AND due_day_of_month IS NULL)
  )
);

CREATE INDEX idx_recurring_payments_user ON recurring_payments(user_id, is_active);

ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recurring_payments" ON recurring_payments FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: recurring_payment_payments (ledger — un pago por periodo)
-- ============================================================
CREATE TABLE recurring_payment_payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_payment_id UUID NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
  period_date          DATE NOT NULL,
  amount               DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  payment_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_id           UUID REFERENCES expenses(id) ON DELETE SET NULL,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Evita que un doble clic en "marcar pagado" (doble tap, reintento de red)
  -- cree dos pagos para el mismo periodo.
  UNIQUE (recurring_payment_id, period_date)
);

CREATE INDEX idx_recurring_payment_payments_rp ON recurring_payment_payments(recurring_payment_id);
CREATE INDEX idx_recurring_payment_payments_expense ON recurring_payment_payments(expense_id) WHERE expense_id IS NOT NULL;

ALTER TABLE recurring_payment_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recurring_payment_payments" ON recurring_payment_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM recurring_payments rp WHERE rp.id = recurring_payment_payments.recurring_payment_id AND rp.user_id = auth.uid())
);

-- ============================================================
-- TABLA: recurring_payment_alerts (alertas in-app, mismo patrón
-- que loan_alerts). notified_at registra la última vez que se
-- envió push/Telegram para esta alerta — permite reenviar el
-- aviso mientras siga OVERDUE sin reenviarlo varias veces el
-- mismo día.
-- ============================================================
CREATE TABLE recurring_payment_alerts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recurring_payment_id UUID NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
  period_date          DATE NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('DUE_SOON', 'OVERDUE')),
  severity             TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'danger', 'success')),
  message              TEXT NOT NULL,
  is_read              BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recurring_payment_id, period_date, type)
);

CREATE INDEX idx_recurring_payment_alerts_user_unread ON recurring_payment_alerts(user_id, is_read);

ALTER TABLE recurring_payment_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recurring_payment_alerts" ON recurring_payment_alerts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: push_subscriptions (suscripciones Web Push del navegador,
-- una por dispositivo/navegador instalado)
-- ============================================================
CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_push_subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- profiles: vínculo con Telegram para el canal de notificación
-- ============================================================
ALTER TABLE profiles ADD COLUMN telegram_chat_id TEXT UNIQUE;

-- ============================================================
-- TABLA: telegram_link_tokens (flujo de vinculación de cuenta sin
-- login: el usuario genera un token de un solo uso desde
-- Configuración y lo envía como /start <token> al bot)
-- ============================================================
CREATE TABLE telegram_link_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT NOT NULL UNIQUE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_link_tokens_token ON telegram_link_tokens(token) WHERE used_at IS NULL;

ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_telegram_link_tokens" ON telegram_link_tokens FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCIÓN: pay_recurring_payment
-- Registra el pago del periodo vigente y, si el pago es MANUAL,
-- avanza next_due_date en la misma transacción para que ambos
-- cambios no puedan quedar inconsistentes entre sí.
-- ============================================================
CREATE OR REPLACE FUNCTION pay_recurring_payment(
  p_recurring_payment_id UUID,
  p_period_date          DATE,
  p_amount               NUMERIC,
  p_expense_id           UUID,
  p_notes                TEXT,
  p_next_due_date        DATE
) RETURNS recurring_payment_payments
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_rp      recurring_payments;
  v_payment recurring_payment_payments;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  SELECT * INTO v_rp FROM recurring_payments
    WHERE id = p_recurring_payment_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago recurrente no encontrado';
  END IF;

  INSERT INTO recurring_payment_payments (
    recurring_payment_id, period_date, amount, expense_id, notes
  ) VALUES (
    p_recurring_payment_id, p_period_date, p_amount, p_expense_id, p_notes
  ) RETURNING * INTO v_payment;

  IF v_rp.schedule_type = 'MANUAL' THEN
    IF p_next_due_date IS NULL THEN
      RAISE EXCEPTION 'Debes indicar la próxima fecha de vencimiento';
    END IF;
    UPDATE recurring_payments SET next_due_date = p_next_due_date, updated_at = NOW()
      WHERE id = p_recurring_payment_id;
  END IF;

  RETURN v_payment;
END;
$$;

GRANT EXECUTE ON FUNCTION pay_recurring_payment TO authenticated;

-- ============================================================
-- Cron: programar el envío diario de recordatorios (push + Telegram).
-- Requiere haber desplegado la Edge Function send-payment-reminders y
-- configurado su secret CRON_SECRET. Ejecutar UNA VEZ, reemplazando
-- <project-ref> y <cron-secret>, después de desplegar la función:
--
-- SELECT cron.schedule(
--   'payment-reminders',
--   '0 13 * * *', -- 8:00am Perú (UTC-5)
--   $$ SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/send-payment-reminders',
--     headers := jsonb_build_object('x-cron-secret', '<cron-secret>')
--   ) $$
-- );
-- ============================================================
