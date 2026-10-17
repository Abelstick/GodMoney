-- 013 — Gastos e ingresos recurrentes automáticos
--
-- Una plantilla (recurring_transactions) crea sola un gasto o ingreso cada mes,
-- el día indicado. No confundir con recurring_payments (006), que solo AVISA
-- de pagos pendientes y no crea movimientos.
--
-- Cómo se generan:
--   * La app llama a generate_my_recurring_transactions() al abrirse (sirve aunque
--     no haya cron configurado: al abrir se ponen al día los meses pendientes).
--   * Opcional: pg_cron lo ejecuta a diario para todos los usuarios (ver el final).
-- Es idempotente: recurring_transaction_runs tiene UNIQUE (plantilla, fecha), así
-- que un mismo mes nunca se genera dos veces, aunque corran dos procesos a la vez.

CREATE TABLE recurring_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  description   TEXT,
  amount        DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  day_of_month  INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  -- Primer día en que puede generarse (no se rellena el pasado anterior a esta fecha).
  start_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date      DATE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_recurring_transactions_user ON recurring_transactions(user_id, is_active);

ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_recurring_transactions" ON recurring_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (category_id IS NULL OR EXISTS (
      SELECT 1 FROM categories c WHERE c.id = category_id AND c.user_id = auth.uid()
    ))
  );

-- Un registro por plantilla y mes generado. Solo lo escribe la función
-- (SECURITY DEFINER); los usuarios únicamente pueden leerlo.
CREATE TABLE recurring_transaction_runs (
  template_id UUID NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,                       -- fecha de vencimiento (= fecha del movimiento)
  expense_id  UUID REFERENCES expenses(id) ON DELETE SET NULL,
  income_id   UUID REFERENCES incomes(id)  ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (template_id, period_date)
);

ALTER TABLE recurring_transaction_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_recurring_runs" ON recurring_transaction_runs
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- Generación. p_user NULL = todos los usuarios (solo cron / postgres).
-- Devuelve cuántos movimientos creó.
-- Reglas:
--   * día 31 en un mes corto cae el último día del mes;
--   * no se generan fechas futuras ni anteriores a start_date;
--   * al ponerse al día solo se miran los últimos 12 meses;
--   * un error en una plantilla no bloquea a las demás (se avisa y se sigue).
-- ============================================================
CREATE OR REPLACE FUNCTION _generate_recurring_transactions(p_user UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_today   DATE := (NOW() AT TIME ZONE 'America/Lima')::DATE;
  v_count   INTEGER := 0;
  v_tpl     recurring_transactions;
  v_month   DATE;
  v_due     DATE;
  v_rows    INTEGER;
  v_id      UUID;
BEGIN
  FOR v_tpl IN
    SELECT * FROM recurring_transactions
    WHERE is_active AND (p_user IS NULL OR user_id = p_user)
  LOOP
    FOR v_month IN
      SELECT gs::DATE FROM generate_series(
        GREATEST(DATE_TRUNC('month', v_tpl.start_date)::DATE, (DATE_TRUNC('month', v_today) - INTERVAL '11 months')::DATE),
        DATE_TRUNC('month', v_today)::DATE,
        INTERVAL '1 month'
      ) AS gs
    LOOP
      v_due := v_month + (LEAST(
        v_tpl.day_of_month,
        EXTRACT(DAY FROM (v_month + INTERVAL '1 month' - INTERVAL '1 day'))::INT
      ) - 1);

      CONTINUE WHEN v_due < v_tpl.start_date
                 OR v_due > v_today
                 OR (v_tpl.end_date IS NOT NULL AND v_due > v_tpl.end_date);

      BEGIN
        INSERT INTO recurring_transaction_runs (template_id, user_id, period_date)
        VALUES (v_tpl.id, v_tpl.user_id, v_due)
        ON CONFLICT (template_id, period_date) DO NOTHING;
        GET DIAGNOSTICS v_rows = ROW_COUNT;
        CONTINUE WHEN v_rows = 0;  -- ya generado antes

        IF v_tpl.type = 'expense' THEN
          INSERT INTO expenses (user_id, category_id, amount, description, date, is_fixed, tags, notes)
          VALUES (v_tpl.user_id, v_tpl.category_id, v_tpl.amount, v_tpl.description, v_due, TRUE, v_tpl.tags, v_tpl.notes)
          RETURNING id INTO v_id;
          UPDATE recurring_transaction_runs SET expense_id = v_id
            WHERE template_id = v_tpl.id AND period_date = v_due;
        ELSE
          INSERT INTO incomes (user_id, category_id, amount, description, date, is_recurring, tags, notes)
          VALUES (v_tpl.user_id, v_tpl.category_id, v_tpl.amount, v_tpl.description, v_due, TRUE, v_tpl.tags, v_tpl.notes)
          RETURNING id INTO v_id;
          UPDATE recurring_transaction_runs SET income_id = v_id
            WHERE template_id = v_tpl.id AND period_date = v_due;
        END IF;

        v_count := v_count + 1;
      EXCEPTION WHEN OTHERS THEN
        -- El bloque se revierte entero (incluida la fila de runs): se reintentará en la próxima ejecución.
        RAISE WARNING 'recurring_transactions % (%): %', v_tpl.id, v_due, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Versión para la app: solo procesa al usuario autenticado. SECURITY DEFINER
-- porque la función interna no es ejecutable por usuarios.
CREATE OR REPLACE FUNCTION generate_my_recurring_transactions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  RETURN _generate_recurring_transactions(auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION _generate_recurring_transactions   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION generate_my_recurring_transactions FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION generate_my_recurring_transactions TO authenticated;

-- ============================================================
-- Opcional — cron diario (00:05 hora Perú) para que los movimientos existan
-- aunque no abras la app. Ejecutar UNA VEZ en el SQL Editor:
--
-- SELECT cron.schedule(
--   'recurring-transactions',
--   '5 5 * * *',
--   $$ SELECT _generate_recurring_transactions(NULL) $$
-- );
-- ============================================================
