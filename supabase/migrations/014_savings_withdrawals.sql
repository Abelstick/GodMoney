-- ============================================================
-- GodMoney - Migración 014: deudas con tu ahorro ("préstamo a mí mismo").
-- Registra dinero que salió de una cuenta de ahorro y que el usuario quiere
-- reponer. Puede nacer de:
--   WITHDRAWAL → una transferencia concreta desde la cuenta de ahorro
--   DEFICIT    → un periodo que cerró en negativo (p. ej. el año 2025), cubierto con ahorro
--   MANUAL     → cualquier otra deuda declarada a mano (retiros antiguos no registrados)
--
-- Las reposiciones son transferencias normales HACIA la cuenta de ahorro con
-- repays_withdrawal_id apuntando a la deuda. Un trigger mantiene repaid_amount
-- y status al día. Reponer NO es un gasto en categoría de ahorro, para no
-- inflar la tasa de ahorro: es devolver dinero que ya estaba ahorrado.
-- ============================================================

CREATE TABLE savings_withdrawals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  savings_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  transfer_id        UUID UNIQUE REFERENCES transfers(id) ON DELETE CASCADE,
  origin             TEXT NOT NULL DEFAULT 'WITHDRAWAL'
                       CHECK (origin IN ('WITHDRAWAL', 'DEFICIT', 'MANUAL')),
  amount             DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  repaid_amount      DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (repaid_amount >= 0),
  reason             TEXT,
  period_label       TEXT,           -- ej. '2025' o '2026-03' cuando origin = 'DEFICIT'
  target_date        DATE,           -- "lo repongo antes de..."
  status             TEXT NOT NULL DEFAULT 'OPEN'
                       CHECK (status IN ('OPEN', 'REPAID', 'FORGIVEN')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Solo los retiros concretos llevan transferencia de origen.
  CHECK ((origin = 'WITHDRAWAL') = (transfer_id IS NOT NULL))
);

CREATE INDEX idx_savings_withdrawals_user_status ON savings_withdrawals(user_id, status);
CREATE INDEX idx_savings_withdrawals_account     ON savings_withdrawals(savings_account_id);

ALTER TABLE savings_withdrawals ENABLE ROW LEVEL SECURITY;

-- Se valida propiedad de la cuenta y de la transferencia (mismo criterio que
-- goal_account_links): nadie puede colgar una deuda de una cuenta ajena.
CREATE POLICY "users_own_savings_withdrawals" ON savings_withdrawals FOR ALL USING (
  auth.uid() = user_id
) WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (SELECT 1 FROM accounts WHERE accounts.id = savings_withdrawals.savings_account_id AND accounts.user_id = auth.uid()) AND
  (transfer_id IS NULL OR EXISTS (SELECT 1 FROM transfers WHERE transfers.id = savings_withdrawals.transfer_id AND transfers.user_id = auth.uid()))
);

-- Un retiro debe salir de la cuenta de ahorro que dice la deuda.
CREATE OR REPLACE FUNCTION validate_savings_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_from UUID;
BEGIN
  IF NEW.transfer_id IS NOT NULL THEN
    SELECT from_account_id INTO v_from
      FROM transfers WHERE id = NEW.transfer_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Transferencia de origen no encontrada';
    END IF;
    IF v_from <> NEW.savings_account_id THEN
      RAISE EXCEPTION 'La transferencia no sale de la cuenta de ahorro indicada';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_savings_withdrawal
  BEFORE INSERT OR UPDATE OF transfer_id, savings_account_id ON savings_withdrawals
  FOR EACH ROW EXECUTE FUNCTION validate_savings_withdrawal();

-- ── Reposiciones ──────────────────────────────────────────────
ALTER TABLE transfers
  ADD COLUMN repays_withdrawal_id UUID REFERENCES savings_withdrawals(id) ON DELETE SET NULL;

CREATE INDEX idx_transfers_repays_withdrawal ON transfers(repays_withdrawal_id)
  WHERE repays_withdrawal_id IS NOT NULL;

-- Una reposición debe ir HACIA la cuenta de ahorro de la deuda, y la deuda
-- debe ser del mismo usuario.
CREATE OR REPLACE FUNCTION validate_withdrawal_repayment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_account UUID;
BEGIN
  IF NEW.repays_withdrawal_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT savings_account_id INTO v_account
    FROM savings_withdrawals WHERE id = NEW.repays_withdrawal_id AND user_id = NEW.user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deuda con el ahorro no encontrada';
  END IF;
  IF NEW.to_account_id <> v_account THEN
    RAISE EXCEPTION 'La reposición debe ir a la cuenta de ahorro de la deuda';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_withdrawal_repayment
  BEFORE INSERT OR UPDATE OF repays_withdrawal_id, to_account_id ON transfers
  FOR EACH ROW EXECUTE FUNCTION validate_withdrawal_repayment();

-- Recalcula lo repuesto de una deuda a partir de sus transferencias. El
-- estado lo deriva el trigger BEFORE UPDATE de savings_withdrawals.
CREATE OR REPLACE FUNCTION recalc_savings_withdrawal(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE savings_withdrawals SET repaid_amount = (
    SELECT COALESCE(SUM(amount), 0) FROM transfers WHERE repays_withdrawal_id = p_id
  ) WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_withdrawal_repayments()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM recalc_savings_withdrawal(OLD.repays_withdrawal_id);
  END IF;
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.repays_withdrawal_id IS DISTINCT FROM OLD.repays_withdrawal_id) THEN
    PERFORM recalc_savings_withdrawal(NEW.repays_withdrawal_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_withdrawal_repayments
  AFTER INSERT OR DELETE OR UPDATE OF amount, repays_withdrawal_id ON transfers
  FOR EACH ROW EXECUTE FUNCTION sync_withdrawal_repayments();

-- Deriva el estado en cada cambio de la deuda:
--   · repaid_amount solo lo escribe recalc_savings_withdrawal (llamado desde un
--     trigger de transfers, profundidad > 1); un UPDATE directo del cliente lo ignora.
--   · FORGIVEN es una decisión del usuario ("ya no lo repongo") y se respeta.
--   · Si corrige el monto o la "des-perdona", se reevalúa contra lo repuesto.
CREATE OR REPLACE FUNCTION derive_withdrawal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.repaid_amount := 0;
  ELSIF NEW.repaid_amount IS DISTINCT FROM OLD.repaid_amount AND pg_trigger_depth() <= 1 THEN
    NEW.repaid_amount := OLD.repaid_amount;
  END IF;

  IF NEW.status <> 'FORGIVEN' THEN
    NEW.status := CASE WHEN NEW.repaid_amount >= NEW.amount THEN 'REPAID' ELSE 'OPEN' END;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_derive_withdrawal_status
  BEFORE INSERT OR UPDATE ON savings_withdrawals
  FOR EACH ROW EXECUTE FUNCTION derive_withdrawal_status();


ALTER TABLE accounts ADD COLUMN is_savings BOOLEAN NOT NULL DEFAULT FALSE;
