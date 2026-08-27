-- ============================================================
-- GodMoney - Migración: trazabilidad de score crediticio
-- Ejecutar en el SQL Editor de Supabase después de 004_delete_loan.sql.
-- ============================================================

CREATE TABLE credit_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score         INTEGER NOT NULL CHECK (score > 0),
  source        TEXT,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_credit_scores_user_date ON credit_scores(user_id, recorded_date DESC);

ALTER TABLE credit_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_credit_scores" ON credit_scores FOR ALL USING (auth.uid() = user_id);
