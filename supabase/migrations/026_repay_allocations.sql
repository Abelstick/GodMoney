-- ============================================================
-- GodMoney - Migración 026: reponer eligiendo a qué deudas va el dinero.
-- Ejecutar en el SQL Editor de Supabase después de 025.
--
-- repay_savings() (018) reparte siempre de la deuda más antigua a la más
-- nueva. repay_savings_allocated() recibe el reparto ya decidido por el
-- usuario: una transferencia por cada deuda indicada, por el monto indicado.
--
--   p_allocations: [{ "withdrawal_id": "...", "amount": 20 }, ...]
--   p_extra:       monto adicional que entra como aporte normal (sin deuda)
--
-- Todo ocurre en una sola transacción: si una parte no es válida (deuda ajena,
-- ya cerrada, de otra cuenta o monto mayor a lo pendiente) no se guarda nada.
-- SECURITY INVOKER: corre con los permisos (y RLS) del usuario.
-- ============================================================

CREATE OR REPLACE FUNCTION repay_savings_allocated(
  p_savings_account_id UUID,
  p_from_account_id    UUID,
  p_allocations        JSONB,
  p_extra              NUMERIC DEFAULT 0,
  p_date               DATE DEFAULT CURRENT_DATE,
  p_note               TEXT DEFAULT NULL
)
RETURNS NUMERIC  -- monto aplicado a deudas
LANGUAGE plpgsql
AS $$
DECLARE
  v_user    UUID := auth.uid();
  v_extra   NUMERIC := ROUND(COALESCE(p_extra, 0), 2);
  v_applied NUMERIC := 0;
  v_pending NUMERIC;
  a         RECORD;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_from_account_id = p_savings_account_id THEN
    RAISE EXCEPTION 'La cuenta de origen debe ser distinta a la de destino';
  END IF;
  IF jsonb_typeof(p_allocations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Falta el reparto entre deudas';
  END IF;
  IF v_extra < 0 THEN
    RAISE EXCEPTION 'El aporte extra no puede ser negativo';
  END IF;
  IF (SELECT count(*) <> count(DISTINCT r.withdrawal_id)
        FROM jsonb_to_recordset(p_allocations) AS r(withdrawal_id UUID)) THEN
    RAISE EXCEPTION 'Hay deudas repetidas en el reparto';
  END IF;

  -- Orden fijo por id: dos reposiciones simultáneas bloquean en el mismo orden.
  FOR a IN
    SELECT r.withdrawal_id, ROUND(r.amount, 2) AS amount
      FROM jsonb_to_recordset(p_allocations) AS r(withdrawal_id UUID, amount NUMERIC)
     ORDER BY r.withdrawal_id
  LOOP
    IF a.withdrawal_id IS NULL OR a.amount IS NULL OR a.amount <= 0 THEN
      RAISE EXCEPTION 'Cada parte del reparto necesita una deuda y un monto mayor a cero';
    END IF;

    SELECT amount - repaid_amount INTO v_pending
      FROM savings_withdrawals
     WHERE id = a.withdrawal_id
       AND user_id = v_user
       AND savings_account_id = p_savings_account_id
       AND status = 'OPEN'
       FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Una de las deudas ya no está pendiente en esta cuenta';
    END IF;
    IF a.amount > v_pending THEN
      RAISE EXCEPTION 'El monto supera lo que falta reponer de una deuda';
    END IF;

    INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, date, note, repays_withdrawal_id)
    VALUES (v_user, p_from_account_id, p_savings_account_id, a.amount, p_date,
            COALESCE(p_note, 'Reposición de ahorro'), a.withdrawal_id);
    v_applied := v_applied + a.amount;
  END LOOP;

  IF v_applied + v_extra <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero';
  END IF;

  IF v_extra > 0 THEN
    INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, date, note)
    VALUES (v_user, p_from_account_id, p_savings_account_id, v_extra, p_date,
            COALESCE(p_note, 'Aporte al ahorro'));
  END IF;

  RETURN v_applied;
END;
$$;

REVOKE EXECUTE ON FUNCTION repay_savings_allocated(UUID, UUID, JSONB, NUMERIC, DATE, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION repay_savings_allocated(UUID, UUID, JSONB, NUMERIC, DATE, TEXT) TO authenticated;
