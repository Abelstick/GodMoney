-- 011 — Presupuestos con varias categorías (grupos)
--
-- Un presupuesto pasa a poder cubrir N categorías de gasto (p. ej. "Salud general"
-- = Seguro + Salud). Se usa una tabla puente; budgets.category_id queda como
-- columna heredada (ya no la lee la app) para no romper datos ni rollback.

CREATE TABLE budget_categories (
  budget_id    UUID NOT NULL REFERENCES budgets(id)    ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  PRIMARY KEY (budget_id, category_id)
);

CREATE INDEX idx_budget_categories_category ON budget_categories(category_id);
CREATE INDEX idx_budget_categories_user     ON budget_categories(user_id);

ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- El vínculo debe pertenecer al usuario y apuntar a un presupuesto y una
-- categoría que también sean suyos.
CREATE POLICY "users_own_budget_categories" ON budget_categories
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM budgets    b WHERE b.id = budget_id   AND b.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id AND c.user_id = auth.uid())
  );

-- Migra los presupuestos existentes: su categoría única pasa a ser un vínculo.
INSERT INTO budget_categories (budget_id, category_id, user_id)
SELECT id, category_id, user_id
FROM budgets
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;
