-- ============================================================
-- GodMoney - Migración 023: "Recibido en" en ingresos.--
-- incomes.account_id: cuenta en la que entró el dinero. Opcional; si se
-- indica, un trigger suma el monto al saldo de esa cuenta y lo mantiene
-- sincronizado al editar (monto o cuenta) o eliminar el ingreso.
-- ============================================================

ALTER TABLE incomes
  ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_incomes_account ON incomes(account_id)
  WHERE account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION sync_income_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.account_id AND user_id = OLD.user_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.account_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cuenta de destino no encontrada';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_income_account_balance
  AFTER INSERT OR DELETE OR UPDATE OF amount, account_id ON incomes
  FOR EACH ROW EXECUTE FUNCTION sync_income_account_balance();
