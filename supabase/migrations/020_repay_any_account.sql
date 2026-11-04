
UPDATE expenses e
   SET repay_to_savings = FALSE
  FROM accounts a
 WHERE a.id = e.paid_from_account_id
   AND NOT a.is_savings
   AND e.repay_to_savings;

-- (OPCIONAL) Si los gastos que ya registraste desde una cuenta normal SÍ eran
-- para reponer, marca los de esa cuenta en lugar del UPDATE anterior para que
-- se sumen a lo que falta reponer (cambia 'Nombre de la cuenta'):
--
--   UPDATE expenses e SET repay_to_savings = TRUE
--     FROM accounts a
--    WHERE a.id = e.paid_from_account_id AND a.name = 'Nombre de la cuenta';
--
-- El trigger de abajo creará las deudas al actualizar esas filas.

-- 2) La deuda nace para cualquier cuenta de origen, no solo de ahorro.
CREATE OR REPLACE FUNCTION sync_expense_savings_debt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.paid_from_account_id IS NOT NULL AND NEW.repay_to_savings THEN
    INSERT INTO savings_withdrawals (user_id, savings_account_id, origin, expense_id, amount, reason)
    VALUES (NEW.user_id, NEW.paid_from_account_id, 'EXPENSE', NEW.id, NEW.amount,
            COALESCE(NULLIF(NEW.description, ''), 'Gasto por reponer'))
    ON CONFLICT (expense_id) DO UPDATE SET
      savings_account_id = EXCLUDED.savings_account_id,
      amount             = EXCLUDED.amount,
      reason             = EXCLUDED.reason;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Ya no sale de una cuenta (o no se quiere reponer): la deuda desaparece.
    DELETE FROM savings_withdrawals WHERE expense_id = NEW.id;
  END IF;

  RETURN NULL;
END;
$$;
