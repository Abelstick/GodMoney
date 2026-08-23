-- ============================================================
-- GodMoney - Migración: eliminar préstamo con reversión de movimientos
-- Ejecutar en el SQL Editor de Supabase después de 003_goal_account_links.sql.
-- ============================================================

-- Borra un préstamo por completo, revirtiendo su efecto real en las cuentas:
-- - Deshace el movimiento de la creación (recepción/entrega inicial).
-- - Deshace cada pago registrado, en la cuenta que se usó en ese pago
--   (que puede no ser la cuenta original del préstamo).
-- - Elimina los ingresos/gastos de interés generados por esos pagos.
-- - Borra el préstamo (loan_installments, loan_payments y loan_alerts se
--   eliminan en cascada por las FKs ya definidas).
-- A diferencia de "cancelar" (que conserva el historial), esto trata al
-- préstamo como si nunca hubiera existido.
CREATE OR REPLACE FUNCTION delete_loan_reversed(p_loan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_loan    loans;
  v_payment RECORD;
  v_delta   NUMERIC;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO v_loan FROM loans WHERE id = p_loan_id AND user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Préstamo no encontrado';
  END IF;

  FOR v_payment IN SELECT * FROM loan_payments WHERE loan_id = p_loan_id
  LOOP
    v_delta := CASE WHEN v_loan.type = 'BORROWED' THEN v_payment.amount ELSE -v_payment.amount END;

    UPDATE accounts SET balance = balance + v_delta, updated_at = NOW()
      WHERE id = v_payment.account_id AND user_id = v_uid;

    DELETE FROM expenses WHERE loan_payment_id = v_payment.id;
    DELETE FROM incomes  WHERE loan_payment_id = v_payment.id;
  END LOOP;

  v_delta := CASE WHEN v_loan.type = 'BORROWED' THEN -v_loan.principal_amount ELSE v_loan.principal_amount END;

  UPDATE accounts SET balance = balance + v_delta, updated_at = NOW()
    WHERE id = v_loan.account_id AND user_id = v_uid;

  DELETE FROM loans WHERE id = p_loan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_loan_reversed TO authenticated;
