-- ============================================================
-- GodMoney - Migración 017: regalos consistentes con sus movimientos.
-- Ejecutar en el SQL Editor de Supabase después de 016.
--
--   1. goal_year: el objetivo de ahorro de una ocasión vale para un año.
--   2. purchase_gift / receive_gift: el gasto (o ingreso) y el regalo se
--      guardan en una sola transacción; si algo falla no queda nada a medias.
--   3. Triggers: editar el gasto/ingreso actualiza el regalo; borrar el
--      gasto devuelve el regalo a pendiente.
-- ============================================================

-- ── 1. Objetivo de ahorro por año ─────────────────────────────
ALTER TABLE gift_occasions ADD COLUMN goal_year INTEGER CHECK (goal_year BETWEEN 2000 AND 2100);

-- Vínculos creados antes de esta migración: se asumen del año del objetivo.
UPDATE gift_occasions o
   SET goal_year = EXTRACT(YEAR FROM g.target_date)::INTEGER
  FROM goals g
 WHERE o.goal_id = g.id AND o.goal_year IS NULL AND g.target_date IS NOT NULL;

-- ── Categoría "Regalos" del usuario (se crea si no existe) ────
CREATE OR REPLACE FUNCTION gift_category_id(p_type TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_id  UUID;
BEGIN
  SELECT id INTO v_id FROM categories
   WHERE user_id = v_uid AND lower(trim(name)) = 'regalos' AND type IN (p_type, 'both')
   ORDER BY created_at LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO categories (user_id, name, type, color, icon)
    VALUES (v_uid, 'Regalos', p_type, '#a855f7', 'gift')
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

-- ── 2a. Comprar un regalo (nuevo o existente) ─────────────────
-- p_gift: columnas del regalo (title, person_id, occasion_id, year,
-- estimated_amount, url, notes). Con p_gift_id se actualiza ese regalo.
CREATE OR REPLACE FUNCTION purchase_gift(
  p_gift_id        UUID,
  p_gift           JSONB,
  p_amount         NUMERIC,
  p_date           DATE,
  p_category_id    UUID,
  p_create_expense BOOLEAN,
  p_description    TEXT
) RETURNS gifts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_expense UUID;
  v_gift    gifts;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor a 0'; END IF;
  IF p_date IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria'; END IF;

  IF p_gift_id IS NOT NULL THEN
    SELECT * INTO v_gift FROM gifts WHERE id = p_gift_id AND user_id = v_uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Regalo no encontrado'; END IF;
    IF v_gift.status = 'DONE' THEN RAISE EXCEPTION 'Este regalo ya está registrado como comprado'; END IF;
  END IF;

  IF p_create_expense THEN
    INSERT INTO expenses (user_id, category_id, amount, description, date, tags)
    VALUES (v_uid, COALESCE(p_category_id, gift_category_id('expense')), p_amount, p_description, p_date, ARRAY['regalo'])
    RETURNING id INTO v_expense;
  END IF;

  IF p_gift_id IS NOT NULL THEN
    UPDATE gifts SET
      title            = COALESCE(p_gift->>'title', title),
      person_id        = CASE WHEN p_gift ? 'person_id'   THEN (p_gift->>'person_id')::UUID   ELSE person_id END,
      occasion_id      = CASE WHEN p_gift ? 'occasion_id' THEN (p_gift->>'occasion_id')::UUID ELSE occasion_id END,
      year             = CASE WHEN p_gift ? 'year'        THEN (p_gift->>'year')::INTEGER     ELSE year END,
      estimated_amount = CASE WHEN p_gift ? 'estimated_amount' THEN (p_gift->>'estimated_amount')::NUMERIC ELSE estimated_amount END,
      url              = CASE WHEN p_gift ? 'url'   THEN p_gift->>'url'   ELSE url END,
      notes            = CASE WHEN p_gift ? 'notes' THEN p_gift->>'notes' ELSE notes END,
      direction = 'GIVEN', status = 'DONE', amount = p_amount, date = p_date,
      expense_id = v_expense, updated_at = NOW()
    WHERE id = p_gift_id
    RETURNING * INTO v_gift;
  ELSE
    INSERT INTO gifts (
      user_id, direction, status, title, person_id, occasion_id, year,
      estimated_amount, url, notes, amount, date, expense_id
    ) VALUES (
      v_uid, 'GIVEN', 'DONE', p_gift->>'title',
      (p_gift->>'person_id')::UUID, (p_gift->>'occasion_id')::UUID, (p_gift->>'year')::INTEGER,
      (p_gift->>'estimated_amount')::NUMERIC, p_gift->>'url', p_gift->>'notes',
      p_amount, p_date, v_expense
    ) RETURNING * INTO v_gift;
  END IF;

  RETURN v_gift;
END;
$$;

-- ── 2b. Registrar un regalo recibido ──────────────────────────
CREATE OR REPLACE FUNCTION receive_gift(
  p_gift          JSONB,
  p_create_income BOOLEAN,
  p_category_id   UUID,
  p_description   TEXT
) RETURNS gifts
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_amount NUMERIC := (p_gift->>'amount')::NUMERIC;
  v_date   DATE := (p_gift->>'date')::DATE;
  v_money  BOOLEAN := COALESCE((p_gift->>'is_money')::BOOLEAN, FALSE);
  v_income UUID;
  v_gift   gifts;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF v_date IS NULL THEN RAISE EXCEPTION 'La fecha es obligatoria'; END IF;
  IF v_money AND (v_amount IS NULL OR v_amount <= 0) THEN RAISE EXCEPTION 'El monto debe ser mayor a 0'; END IF;

  IF v_money AND p_create_income THEN
    INSERT INTO incomes (user_id, category_id, amount, description, date, tags)
    VALUES (v_uid, COALESCE(p_category_id, gift_category_id('income')), v_amount, p_description, v_date, ARRAY['regalo'])
    RETURNING id INTO v_income;
  END IF;

  INSERT INTO gifts (
    user_id, direction, status, title, person_id, occasion_id, year,
    amount, is_money, date, notes, income_id
  ) VALUES (
    v_uid, 'RECEIVED', 'DONE', p_gift->>'title',
    (p_gift->>'person_id')::UUID, (p_gift->>'occasion_id')::UUID, (p_gift->>'year')::INTEGER,
    v_amount, v_money, v_date, p_gift->>'notes', v_income
  ) RETURNING * INTO v_gift;

  RETURN v_gift;
END;
$$;

REVOKE EXECUTE ON FUNCTION gift_category_id FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION purchase_gift    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION receive_gift     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION gift_category_id TO authenticated;
GRANT  EXECUTE ON FUNCTION purchase_gift    TO authenticated;
GRANT  EXECUTE ON FUNCTION receive_gift     TO authenticated;

-- ── 3. Mantener el regalo al día con su movimiento ────────────
-- Editar monto/fecha del gasto o ingreso se refleja en el regalo.
CREATE OR REPLACE FUNCTION sync_gift_from_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.amount IS DISTINCT FROM OLD.amount OR NEW.date IS DISTINCT FROM OLD.date THEN
    IF TG_TABLE_NAME = 'expenses' THEN
      UPDATE gifts SET amount = NEW.amount, date = NEW.date, updated_at = NOW() WHERE expense_id = NEW.id;
    ELSE
      UPDATE gifts SET amount = NEW.amount, date = NEW.date, updated_at = NOW() WHERE income_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expenses_sync_gift AFTER UPDATE OF amount, date ON expenses
  FOR EACH ROW EXECUTE FUNCTION sync_gift_from_movement();
CREATE TRIGGER trg_incomes_sync_gift AFTER UPDATE OF amount, date ON incomes
  FOR EACH ROW EXECUTE FUNCTION sync_gift_from_movement();

-- Borrar el gasto de un regalo = la compra no ocurrió: vuelve a planificado
-- (o a idea si no tenía ocasión) y conserva el monto como estimado.
-- Va en BEFORE DELETE para correr antes del ON DELETE SET NULL de la FK.
CREATE OR REPLACE FUNCTION revert_gift_on_expense_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE gifts SET
    status = CASE WHEN occasion_id IS NOT NULL THEN 'PLANNED' ELSE 'IDEA' END,
    estimated_amount = COALESCE(estimated_amount, amount),
    amount = NULL,
    date = NULL,
    expense_id = NULL,
    updated_at = NOW()
  WHERE expense_id = OLD.id AND direction = 'GIVEN';
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_expenses_revert_gift BEFORE DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION revert_gift_on_expense_delete();
