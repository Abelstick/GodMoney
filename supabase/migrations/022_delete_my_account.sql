-- 022 — Eliminar la propia cuenta desde la app
--
-- Borra al usuario autenticado y, en cascada, todos sus datos. Es SECURITY DEFINER
-- porque la app no puede tocar auth.users, y por eso actúa solo sobre auth.uid():
-- no recibe parámetros, así que nadie puede pedir borrar a otro usuario.
--
-- Borrar auth.users sin más no basta: loans, loan_payments, transfers y
-- savings_withdrawals apuntan a accounts con ON DELETE RESTRICT, y según el orden
-- de la cascada el borrado se aborta. Por eso esas tablas se vacían antes.
-- Todo ocurre en una transacción: si algo falla, no se borra nada.

CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No hay sesión activa' USING ERRCODE = '28000';
  END IF;

  DELETE FROM savings_withdrawals WHERE user_id = v_user;
  DELETE FROM transfers WHERE user_id = v_user;
  DELETE FROM loans WHERE user_id = v_user; -- arrastra cuotas, pagos y alertas

  DELETE FROM auth.users WHERE id = v_user; -- arrastra profiles y el resto

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la cuenta' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_my_account() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION delete_my_account() TO authenticated;
