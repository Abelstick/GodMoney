-- 010 — Endurecimiento de seguridad (RLS)
--
-- 1) categories: la política original permitía `OR is_default = TRUE`, pero las
--    categorías por defecto son copias POR USUARIO (user_id = dueño). Con esa
--    condición cualquier usuario autenticado podía leer, editar y borrar las
--    categorías por defecto de TODOS los demás. Se restringe al dueño.
DROP POLICY IF EXISTS "users_own_categories" ON categories;
CREATE POLICY "users_own_categories" ON categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Las funciones RPC se crean con EXECUTE para PUBLIC (incluye `anon`, la
--    clave pública del frontend). Solo deben ser invocables por usuarios con sesión.
REVOKE EXECUTE ON FUNCTION create_loan_with_installments FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION register_loan_payment         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION delete_loan_reversed          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION pay_recurring_payment         FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION create_loan_with_installments TO authenticated;
GRANT  EXECUTE ON FUNCTION register_loan_payment         TO authenticated;
GRANT  EXECUTE ON FUNCTION delete_loan_reversed          TO authenticated;
GRANT  EXECUTE ON FUNCTION pay_recurring_payment         TO authenticated;
