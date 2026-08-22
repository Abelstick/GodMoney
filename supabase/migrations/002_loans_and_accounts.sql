-- ============================================================
-- GodMoney - Migración: Cuentas + Préstamos y Deudas
-- Ejecutar en el SQL Editor de Supabase sobre una base de datos
-- que ya tiene supabase/schema.sql aplicado.
-- ============================================================

-- ============================================================
-- TABLA: accounts (cuentas/billeteras — módulo mínimo)
-- ============================================================
CREATE TABLE accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  balance      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  color        TEXT NOT NULL DEFAULT '#6366f1',
  icon         TEXT NOT NULL DEFAULT 'wallet',
  is_archived  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_user ON accounts(user_id);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: loans (préstamos — BORROWED = me prestaron, LENT = yo presté)
-- ============================================================
CREATE TABLE loans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL CHECK (type IN ('BORROWED', 'LENT')),
  person_name           TEXT NOT NULL,
  description           TEXT,
  principal_amount      DECIMAL(12, 2) NOT NULL CHECK (principal_amount > 0),
  interest_rate         DECIMAL(6, 3) NOT NULL DEFAULT 0 CHECK (interest_rate >= 0),
  interest_type         TEXT NOT NULL DEFAULT 'NONE' CHECK (interest_type IN ('NONE', 'PERCENTAGE')),
  start_date            DATE NOT NULL,
  due_date              DATE NOT NULL,
  number_of_installments INTEGER NOT NULL DEFAULT 1 CHECK (number_of_installments > 0),
  status                TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID', 'OVERDUE', 'CANCELLED')),
  remaining_principal   DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (remaining_principal >= 0),
  remaining_interest    DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (remaining_interest >= 0),
  account_id            UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (due_date >= start_date)
);

CREATE INDEX idx_loans_user_type   ON loans(user_id, type);
CREATE INDEX idx_loans_user_status ON loans(user_id, status);
CREATE INDEX idx_loans_account     ON loans(account_id);

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_loans" ON loans FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- TABLA: loan_installments (cronograma de cuotas)
-- ============================================================
CREATE TABLE loan_installments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id            UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date           DATE NOT NULL,
  principal_amount   DECIMAL(12, 2) NOT NULL CHECK (principal_amount >= 0),
  interest_amount    DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (interest_amount >= 0),
  total_amount       DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
  paid_amount        DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status             TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')),
  paid_at            TIMESTAMPTZ,
  UNIQUE (loan_id, installment_number)
);

CREATE INDEX idx_loan_installments_loan ON loan_installments(loan_id);
CREATE INDEX idx_loan_installments_due  ON loan_installments(due_date);

ALTER TABLE loan_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_loan_installments" ON loan_installments FOR ALL USING (
  EXISTS (SELECT 1 FROM loans WHERE loans.id = loan_installments.loan_id AND loans.user_id = auth.uid())
);

-- ============================================================
-- TABLA: loan_payments (pagos / cobros — ledger inmutable)
-- ============================================================
CREATE TABLE loan_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id          UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_id   UUID REFERENCES loan_installments(id) ON DELETE SET NULL,
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount           DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  principal_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (principal_amount >= 0),
  interest_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (interest_amount >= 0),
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id);

ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_loan_payments" ON loan_payments FOR ALL USING (
  EXISTS (SELECT 1 FROM loans WHERE loans.id = loan_payments.loan_id AND loans.user_id = auth.uid())
);

-- ============================================================
-- TABLA: loan_alerts (alertas persistentes del módulo de préstamos)
-- ============================================================
CREATE TABLE loan_alerts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loan_id        UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  installment_id UUID REFERENCES loan_installments(id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN (
                   'INSTALLMENT_DUE_SOON', 'INSTALLMENT_OVERDUE',
                   'LOAN_DUE_SOON', 'LOAN_OVERDUE', 'LOAN_PAID'
                 )),
  severity       TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger', 'success')),
  message        TEXT NOT NULL,
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Columna generada para poder declarar un UNIQUE "normal" (no de expresión):
  -- así el cliente puede usar upsert(...).onConflict('loan_id,dedupe_key,type')
  -- con ON CONFLICT DO NOTHING, algo que PostgREST no soporta sobre un índice
  -- de expresión. Para alertas a nivel de préstamo (installment_id NULL) usa
  -- el propio loan_id, con lo que el UNIQUE se comporta como (loan_id, type).
  dedupe_key     UUID GENERATED ALWAYS AS (COALESCE(installment_id, loan_id)) STORED,
  UNIQUE (loan_id, dedupe_key, type)
);

CREATE INDEX idx_loan_alerts_user_unread ON loan_alerts(user_id, is_read);

ALTER TABLE loan_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_loan_alerts" ON loan_alerts FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Compatibilidad: enlazar el interés de un pago de préstamo con el
-- ingreso/gasto financiero real que genera (capital NUNCA se registra aquí).
-- ============================================================
ALTER TABLE incomes  ADD COLUMN loan_payment_id UUID REFERENCES loan_payments(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN loan_payment_id UUID REFERENCES loan_payments(id) ON DELETE SET NULL;

CREATE INDEX idx_incomes_loan_payment  ON incomes(loan_payment_id)  WHERE loan_payment_id IS NOT NULL;
CREATE INDEX idx_expenses_loan_payment ON expenses(loan_payment_id) WHERE loan_payment_id IS NOT NULL;

-- ============================================================
-- FUNCIÓN: create_loan_with_installments
-- Crea el préstamo + su cronograma de cuotas + ajusta el saldo de la
-- cuenta relacionada, todo en una sola transacción. El cronograma se
-- calcula en JS (src/lib/loanAmortization.js) y se pasa ya resuelto.
-- SECURITY INVOKER: corre con los permisos del usuario autenticado,
-- las políticas RLS de arriba son las que protegen los datos.
-- ============================================================
CREATE OR REPLACE FUNCTION create_loan_with_installments(
  p_type                   TEXT,
  p_person_name            TEXT,
  p_description            TEXT,
  p_principal_amount       NUMERIC,
  p_interest_rate          NUMERIC,
  p_interest_type          TEXT,
  p_start_date             DATE,
  p_due_date               DATE,
  p_number_of_installments INTEGER,
  p_account_id             UUID,
  p_notes                  TEXT,
  p_installments           JSONB
) RETURNS loans
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_loan          loans;
  v_total_interest NUMERIC;
  v_delta         NUMERIC;
  v_item          JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_type NOT IN ('BORROWED', 'LENT') THEN
    RAISE EXCEPTION 'Tipo de préstamo inválido';
  END IF;
  IF p_principal_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a 0';
  END IF;

  SELECT COALESCE(SUM((i->>'interest_amount')::NUMERIC), 0)
    INTO v_total_interest
    FROM jsonb_array_elements(p_installments) i;

  INSERT INTO loans (
    user_id, type, person_name, description, principal_amount,
    interest_rate, interest_type, start_date, due_date, number_of_installments,
    status, remaining_principal, remaining_interest, account_id, notes
  ) VALUES (
    v_uid, p_type, p_person_name, p_description, p_principal_amount,
    p_interest_rate, p_interest_type, p_start_date, p_due_date, p_number_of_installments,
    'ACTIVE', p_principal_amount, v_total_interest, p_account_id, p_notes
  ) RETURNING * INTO v_loan;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_installments)
  LOOP
    INSERT INTO loan_installments (
      loan_id, installment_number, due_date, principal_amount, interest_amount, total_amount
    ) VALUES (
      v_loan.id,
      (v_item->>'installment_number')::INTEGER,
      (v_item->>'due_date')::DATE,
      (v_item->>'principal_amount')::NUMERIC,
      (v_item->>'interest_amount')::NUMERIC,
      (v_item->>'total_amount')::NUMERIC
    );
  END LOOP;

  -- BORROWED: recibo dinero -> mi cuenta aumenta. LENT: entrego dinero -> mi cuenta disminuye.
  v_delta := CASE WHEN p_type = 'BORROWED' THEN p_principal_amount ELSE -p_principal_amount END;

  UPDATE accounts SET balance = balance + v_delta, updated_at = NOW()
    WHERE id = p_account_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta no encontrada';
  END IF;

  RETURN v_loan;
END;
$$;

-- ============================================================
-- FUNCIÓN: register_loan_payment
-- Registra un pago/cobro: inserta el pago, actualiza la cuota (si aplica),
-- actualiza el saldo del préstamo, ajusta la cuenta, y si hay interés
-- crea el ingreso/gasto financiero real correspondiente. Todo atómico.
-- ============================================================
CREATE OR REPLACE FUNCTION register_loan_payment(
  p_loan_id        UUID,
  p_installment_id UUID,
  p_account_id     UUID,
  p_principal      NUMERIC,
  p_interest       NUMERIC,
  p_payment_date   DATE,
  p_notes          TEXT
) RETURNS loan_payments
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_loan          loans;
  v_installment   loan_installments;
  v_amount        NUMERIC := COALESCE(p_principal, 0) + COALESCE(p_interest, 0);
  v_payment       loan_payments;
  v_delta         NUMERIC;
  v_new_paid      NUMERIC;
  v_new_status    TEXT;
  v_category_id   UUID;
  v_category_name TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'El monto del pago debe ser mayor a 0';
  END IF;

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Préstamo no encontrado';
  END IF;
  IF v_loan.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'El préstamo está cancelado';
  END IF;

  INSERT INTO loan_payments (
    loan_id, installment_id, account_id, amount, principal_amount, interest_amount, payment_date, notes
  ) VALUES (
    p_loan_id, p_installment_id, p_account_id, v_amount,
    COALESCE(p_principal, 0), COALESCE(p_interest, 0), p_payment_date, p_notes
  ) RETURNING * INTO v_payment;

  IF p_installment_id IS NOT NULL THEN
    SELECT * INTO v_installment FROM loan_installments
      WHERE id = p_installment_id AND loan_id = p_loan_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cuota no encontrada';
    END IF;

    v_new_paid   := v_installment.paid_amount + v_amount;
    v_new_status := CASE
                      WHEN v_new_paid >= v_installment.total_amount - 0.005 THEN 'PAID'
                      WHEN v_new_paid > 0 THEN 'PARTIAL'
                      ELSE 'PENDING'
                    END;

    UPDATE loan_installments SET
      paid_amount = v_new_paid,
      status      = v_new_status,
      paid_at     = CASE WHEN v_new_status = 'PAID' THEN NOW() ELSE paid_at END
      WHERE id = p_installment_id;
  END IF;

  UPDATE loans SET
    remaining_principal = GREATEST(remaining_principal - COALESCE(p_principal, 0), 0),
    remaining_interest  = GREATEST(remaining_interest  - COALESCE(p_interest, 0), 0),
    updated_at = NOW()
    WHERE id = p_loan_id
    RETURNING * INTO v_loan;

  IF v_loan.remaining_principal <= 0.005 THEN
    UPDATE loans SET status = 'PAID' WHERE id = p_loan_id RETURNING * INTO v_loan;
  END IF;

  -- BORROWED: pago sale de mi cuenta. LENT: cobro entra a mi cuenta.
  v_delta := CASE WHEN v_loan.type = 'BORROWED' THEN -v_amount ELSE v_amount END;

  UPDATE accounts SET balance = balance + v_delta, updated_at = NOW()
    WHERE id = p_account_id AND user_id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta no encontrada';
  END IF;

  -- El interés SÍ es un movimiento real: gasto financiero (BORROWED) o ingreso financiero (LENT).
  -- El capital nunca genera fila en incomes/expenses.
  IF COALESCE(p_interest, 0) > 0 THEN
    v_category_name := CASE WHEN v_loan.type = 'BORROWED' THEN 'Interés pagado' ELSE 'Interés ganado' END;

    SELECT id INTO v_category_id FROM categories
      WHERE user_id = v_uid AND name = v_category_name
      LIMIT 1;

    IF v_category_id IS NULL THEN
      INSERT INTO categories (user_id, name, type, color, icon, is_default)
      VALUES (
        v_uid, v_category_name,
        CASE WHEN v_loan.type = 'BORROWED' THEN 'expense' ELSE 'income' END,
        CASE WHEN v_loan.type = 'BORROWED' THEN '#f97316' ELSE '#22c55e' END,
        'percentage', TRUE
      ) RETURNING id INTO v_category_id;
    END IF;

    IF v_loan.type = 'BORROWED' THEN
      INSERT INTO expenses (user_id, category_id, amount, description, date, is_fixed, loan_payment_id)
      VALUES (v_uid, v_category_id, p_interest, 'Interés — préstamo de ' || v_loan.person_name, p_payment_date, FALSE, v_payment.id);
    ELSE
      INSERT INTO incomes (user_id, category_id, amount, description, date, is_recurring, loan_payment_id)
      VALUES (v_uid, v_category_id, p_interest, 'Interés — préstamo a ' || v_loan.person_name, p_payment_date, FALSE, v_payment.id);
    END IF;
  END IF;

  RETURN v_payment;
END;
$$;

-- Aseguramos que el rol autenticado pueda ejecutar ambas funciones
-- (en la mayoría de proyectos Supabase esto ya viene por defecto, pero
-- se deja explícito para no depender de esa configuración).
GRANT EXECUTE ON FUNCTION create_loan_with_installments TO authenticated;
GRANT EXECUTE ON FUNCTION register_loan_payment TO authenticated;
