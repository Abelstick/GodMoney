-- ============================================================
-- GodMoney - Migración 024: dinero bancario vs. efectivo.
-- Ejecutar en el SQL Editor de Supabase después de 023.
--
-- 1) accounts.kind: 'BANK' (cuenta bancaria / billetera digital) o 'CASH'
--    (efectivo). Las cuentas existentes cuyo nombre dice "efectivo" o "cash"
--    pasan a 'CASH'; el resto queda como 'BANK' (se puede cambiar al editar).
-- 2) incomes.money_type: si el ingreso llegó como dinero bancario o en
--    efectivo. Opcional para los ingresos antiguos. Si el ingreso tiene cuenta,
--    se toma siempre del tipo de esa cuenta para que no se contradigan.
-- ============================================================

-- ── 1) Tipo de cuenta ─────────────────────────────────────────
ALTER TABLE accounts
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'BANK' CHECK (kind IN ('BANK', 'CASH'));

UPDATE accounts SET kind = 'CASH'
 WHERE name ILIKE '%efectivo%' OR name ILIKE '%cash%';

-- ── 2) Tipo de dinero del ingreso ─────────────────────────────
ALTER TABLE incomes
  ADD COLUMN money_type TEXT CHECK (money_type IN ('BANK', 'CASH'));

-- Los ingresos que ya tienen cuenta heredan su tipo.
UPDATE incomes i SET money_type = a.kind
  FROM accounts a
 WHERE a.id = i.account_id;

CREATE OR REPLACE FUNCTION set_income_money_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_kind TEXT;
BEGIN
  IF NEW.account_id IS NOT NULL THEN
    SELECT kind INTO v_kind
      FROM accounts WHERE id = NEW.account_id AND user_id = NEW.user_id;
    IF v_kind IS NOT NULL THEN
      NEW.money_type := v_kind;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_income_money_type
  BEFORE INSERT OR UPDATE OF account_id, money_type ON incomes
  FOR EACH ROW EXECUTE FUNCTION set_income_money_type();
