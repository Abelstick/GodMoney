-- ============================================================
-- GodMoney - Migración 019: escenarios del simulador
-- "¿Qué pasaría si...?". Ejecutar en el SQL Editor de Supabase
-- después de 018.
--
-- Un escenario es solo una hipótesis: guarda su configuración y sus
-- eventos como JSON y NO tiene relación con expenses, incomes,
-- accounts ni budgets. Guardarlo, editarlo o borrarlo nunca cambia
-- movimientos ni saldos reales.
-- ============================================================

CREATE TABLE simulation_scenarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  -- { balanceMode, initialBalance, accountBalances, startDate, horizon, customEnd, threshold }
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- [{ id, type, description, amount, date, repeat, until, categoryId, accountId, toAccountId, enabled, source }]
  events      JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(events) = 'array'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_simulation_scenarios_user ON simulation_scenarios(user_id, updated_at DESC);

ALTER TABLE simulation_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_simulation_scenarios" ON simulation_scenarios
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
