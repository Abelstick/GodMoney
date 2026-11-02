-- ============================================================
-- GodMoney - Migración 018: "Pagado desde" en gastos + reposición repartida.
-- Ejecutar en el SQL Editor de Supabase después de 017.
--
-- 1) expenses.paid_from_account_id: cuenta de la que salió el dinero. Opcional;
--    si se indica, un trigger descuenta el monto del saldo de esa cuenta.
-- 2) Si esa cuenta es de ahorro (accounts.is_savings) y repay_to_savings = TRUE,
--    el gasto genera sola una deuda con el ahorro (origin = 'EXPENSE') que se
--    mantiene sincronizada con el gasto (monto, cuenta, borrado).
-- 3) repay_savings(): repone a una cuenta de ahorro repartiendo el monto entre
--    sus deudas abiertas, de la más antigua a la más nueva.
-- ============================================================

-- ── 1) Cuenta de origen del gasto ─────────────────────────────
ALTER TABLE expenses
  ADD COLUMN paid_from_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN repay_to_savings     BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_expenses_paid_from ON expenses(paid_from_account_id)
  WHERE paid_from_account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_expense_paid_from_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.paid_from_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.paid_from_account_id AND user_id = OLD.user_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.paid_from_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.paid_from_account_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cuenta de origen no encontrada';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_expense_paid_from_balance
  AFTER INSERT OR DELETE OR UPDATE OF amount, paid_from_account_id ON expenses
  FOR EACH ROW EXECUTE FUNCTION sync_expense_paid_from_balance();

-- ── 2) Deudas con el ahorro nacidas de un gasto ───────────────
ALTER TABLE savings_withdrawals
  ADD COLUMN expense_id UUID UNIQUE REFERENCES expenses(id) ON DELETE CASCADE;

-- Se reemplazan los CHECK de origin (nombres generados por Postgres).
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'savings_withdrawals'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%origin%'
  LOOP
    EXECUTE format('ALTER TABLE savings_withdrawals DROP CONSTRAINT %I', c.conname);
  END LOOP;
END;
$$;

ALTER TABLE savings_withdrawals
  ADD CONSTRAINT savings_withdrawals_origin_check
    CHECK (origin IN ('WITHDRAWAL', 'DEFICIT', 'MANUAL', 'EXPENSE')),
  ADD CONSTRAINT savings_withdrawals_source_check CHECK (
    (origin = 'WITHDRAWAL') = (transfer_id IS NOT NULL) AND
    (origin = 'EXPENSE')    = (expense_id  IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION sync_expense_savings_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_savings BOOLEAN := FALSE;
BEGIN
  IF NEW.paid_from_account_id IS NOT NULL AND NEW.repay_to_savings THEN
    SELECT is_savings INTO v_is_savings
      FROM accounts WHERE id = NEW.paid_from_account_id AND user_id = NEW.user_id;
  END IF;

  IF COALESCE(v_is_savings, FALSE) THEN
    INSERT INTO savings_withdrawals (user_id, savings_account_id, origin, expense_id, amount, reason)
    VALUES (NEW.user_id, NEW.paid_from_account_id, 'EXPENSE', NEW.id, NEW.amount,
            COALESCE(NULLIF(NEW.description, ''), 'Gasto pagado con ahorro'))
    ON CONFLICT (expense_id) DO UPDATE SET
      savings_account_id = EXCLUDED.savings_account_id,
      amount             = EXCLUDED.amount,
      reason             = EXCLUDED.reason;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ya no sale del ahorro (o no se quiere reponer): la deuda desaparece.
    DELETE FROM savings_withdrawals WHERE expense_id = NEW.id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_expense_savings_debt
  AFTER INSERT OR UPDATE OF amount, paid_from_account_id, repay_to_savings, description ON expenses
  FOR EACH ROW EXECUTE FUNCTION sync_expense_savings_debt();

-- ── 3) Reponer repartiendo entre deudas ───────────────────────
-- Crea una transferencia por cada deuda que cubre (from → cuenta de ahorro).
-- Lo que sobre tras cubrir todo va como transferencia normal (aporte extra).
-- SECURITY INVOKER: corre con los permisos (y RLS) del usuario.
CREATE OR REPLACE FUNCTION repay_savings(
  p_savings_account_id UUID,
  p_from_account_id    UUID,
  p_amount             NUMERIC,
  p_date               DATE DEFAULT CURRENT_DATE,
  p_note               TEXT DEFAULT NULL
)
RETURNS NUMERIC  -- monto aplicado a deudas
LANGUAGE plpgsql
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_left    NUMERIC := p_amount;
  v_applied NUMERIC := 0;
  v_chunk   NUMERIC;
  d         RECORD;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;
  IF p_from_account_id = p_savings_account_id THEN
    RAISE EXCEPTION 'La cuenta de origen debe ser distinta a la de ahorro';
  END IF;

  FOR d IN
    SELECT id, amount - repaid_amount AS pending
      FROM savings_withdrawals
     WHERE user_id = v_user
       AND savings_account_id = p_savings_account_id
       AND status = 'OPEN'
       AND amount > repaid_amount
     ORDER BY created_at
     FOR UPDATE
  LOOP
    EXIT WHEN v_left <= 0;
    v_chunk := LEAST(v_left, d.pending);
    INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, date, note, repays_withdrawal_id)
    VALUES (v_user, p_from_account_id, p_savings_account_id, v_chunk, p_date,
            COALESCE(p_note, 'Reposición de ahorro'), d.id);
    v_left    := v_left - v_chunk;
    v_applied := v_applied + v_chunk;
  END LOOP;

  IF v_left > 0 THEN
    INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, date, note)
    VALUES (v_user, p_from_account_id, p_savings_account_id, v_left, p_date,
            COALESCE(p_note, 'Aporte al ahorro'));
  END IF;

  RETURN v_applied;
END;
$$;

REVOKE EXECUTE ON FUNCTION repay_savings(UUID, UUID, NUMERIC, DATE, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION repay_savings(UUID, UUID, NUMERIC, DATE, TEXT) TO authenticated;
