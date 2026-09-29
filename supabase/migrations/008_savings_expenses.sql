
ALTER TABLE categories ADD COLUMN is_savings BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE expenses
  ADD COLUMN savings_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX idx_expenses_savings_account ON expenses(savings_account_id);

CREATE OR REPLACE FUNCTION sync_savings_expense_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.savings_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.savings_account_id AND user_id = OLD.user_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.savings_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.savings_account_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cuenta de ahorro no encontrada';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_savings_expense_balance
  AFTER INSERT OR DELETE OR UPDATE OF amount, savings_account_id ON expenses
  FOR EACH ROW EXECUTE FUNCTION sync_savings_expense_balance();
