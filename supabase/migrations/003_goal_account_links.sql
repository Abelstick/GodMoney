-- ============================================================
-- GodMoney - Migración: vínculo Objetivos <-> Cuentas (asignación parcial)
-- Ejecutar en el SQL Editor de Supabase después de 002_loans_and_accounts.sql.
-- ============================================================

-- Un objetivo puede recibir "aportes" de una o varias cuentas, y una cuenta
-- puede repartirse entre varios objetivos (asignación parcial, no exclusiva).
-- allocated_amount es lo que el usuario DECLARA que separa para ese objetivo;
-- el monto real que cuenta para el progreso (getGoalDerivedAmount en
-- src/lib/goalProgress.js) se prorratea si el saldo real de la cuenta cae
-- por debajo de lo asignado (p. ej. porque salió dinero en un préstamo).
CREATE TABLE goal_account_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id          UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(12, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (goal_id, account_id)
);

CREATE INDEX idx_goal_account_links_goal    ON goal_account_links(goal_id);
CREATE INDEX idx_goal_account_links_account ON goal_account_links(account_id);

ALTER TABLE goal_account_links ENABLE ROW LEVEL SECURITY;

-- Se valida propiedad tanto del objetivo como de la cuenta (defensa en
-- profundidad: evita que alguien enlace una cuenta que no es suya aunque
-- adivine su id).
CREATE POLICY "users_own_goal_account_links" ON goal_account_links FOR ALL USING (
  EXISTS (SELECT 1 FROM goals    WHERE goals.id    = goal_account_links.goal_id    AND goals.user_id    = auth.uid()) AND
  EXISTS (SELECT 1 FROM accounts WHERE accounts.id = goal_account_links.account_id AND accounts.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM goals    WHERE goals.id    = goal_account_links.goal_id    AND goals.user_id    = auth.uid()) AND
  EXISTS (SELECT 1 FROM accounts WHERE accounts.id = goal_account_links.account_id AND accounts.user_id = auth.uid())
);
