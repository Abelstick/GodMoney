-- ============================================================
-- GodMoney - Migración 025: gastos divididos entre categorías.
-- ============================================================

ALTER TABLE expenses ADD COLUMN split_group_id UUID;

CREATE INDEX idx_expenses_split_group ON expenses(split_group_id)
  WHERE split_group_id IS NOT NULL;
