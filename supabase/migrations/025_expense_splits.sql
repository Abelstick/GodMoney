-- ============================================================
-- GodMoney - Migración 025: gastos divididos entre categorías.
-- ============================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS split_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_expenses_split_group ON expenses(split_group_id)
  WHERE split_group_id IS NOT NULL;

-- ── Guardar un gasto dividido de una sola vez ─────────────────
-- Deja el grupo p_group_id formado exactamente por p_rows (cada fila trae su
-- id, generado en el cliente):
--   · borra las partes del grupo que ya no vienen,
--   · inserta las nuevas y actualiza las que ya existían.
-- Todo ocurre en una transacción: si algo falla (o se corta la conexión) no
-- se guarda nada. Y es idempotente: repetir la misma llamada deja el mismo
-- resultado, así que reintentar tras un error de red es seguro.
-- Para quitar la división se envía una sola fila con split_group_id NULL.
-- Los triggers de saldos y deudas se disparan igual que en un insert/update/delete normal.
-- SECURITY INVOKER: corre con los permisos (y RLS) del usuario.
CREATE OR REPLACE FUNCTION save_expense_split_group(p_group_id UUID, p_rows JSONB)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_ids  UUID[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_group_id IS NULL THEN
    RAISE EXCEPTION 'Falta el grupo del gasto dividido';
  END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) = 0 THEN
    RAISE EXCEPTION 'El gasto necesita al menos una parte';
  END IF;

  SELECT array_agg((r->>'id')::UUID) INTO v_ids FROM jsonb_array_elements(p_rows) AS r;
  IF array_position(v_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Cada parte necesita un id';
  END IF;
  IF cardinality(v_ids) <> (SELECT count(DISTINCT x) FROM unnest(v_ids) AS x) THEN
    RAISE EXCEPTION 'Hay partes repetidas';
  END IF;

  -- Dos guardados del mismo grupo a la vez (p. ej. un reintento) van en fila.
  PERFORM pg_advisory_xact_lock(hashtext(p_group_id::TEXT));

  DELETE FROM expenses
   WHERE user_id = v_user
     AND split_group_id = p_group_id
     AND id <> ALL (v_ids);

  INSERT INTO expenses (
    id, user_id, category_id, amount, description, date, is_fixed,
    savings_account_id, paid_from_account_id, repay_to_savings,
    tags, notes, attachments, split_group_id
  )
  SELECT r.id, v_user, r.category_id, r.amount, r.description, r.date, COALESCE(r.is_fixed, FALSE),
         r.savings_account_id, r.paid_from_account_id, COALESCE(r.repay_to_savings, TRUE),
         COALESCE(r.tags, '{}'), r.notes, COALESCE(r.attachments, '[]'::JSONB), r.split_group_id
    FROM jsonb_to_recordset(p_rows) AS r(
      id UUID, category_id UUID, amount NUMERIC, description TEXT, date DATE, is_fixed BOOLEAN,
      savings_account_id UUID, paid_from_account_id UUID, repay_to_savings BOOLEAN,
      tags TEXT[], notes TEXT, attachments JSONB, split_group_id UUID
    )
  ON CONFLICT (id) DO UPDATE SET
    category_id          = EXCLUDED.category_id,
    amount               = EXCLUDED.amount,
    description          = EXCLUDED.description,
    date                 = EXCLUDED.date,
    is_fixed             = EXCLUDED.is_fixed,
    savings_account_id   = EXCLUDED.savings_account_id,
    paid_from_account_id = EXCLUDED.paid_from_account_id,
    repay_to_savings     = EXCLUDED.repay_to_savings,
    tags                 = EXCLUDED.tags,
    notes                = EXCLUDED.notes,
    attachments          = EXCLUDED.attachments,
    split_group_id       = EXCLUDED.split_group_id
  WHERE expenses.user_id = v_user;

  -- Un id ajeno se habría saltado en silencio: mejor fallar y no guardar nada.
  IF (SELECT count(*) FROM expenses WHERE id = ANY (v_ids) AND user_id = v_user) <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'No se pudo guardar una de las partes';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_expense_split_group(UUID, JSONB) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION save_expense_split_group(UUID, JSONB) TO authenticated;
