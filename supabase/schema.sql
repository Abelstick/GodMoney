-- ============================================================
-- GodMoney - Schema de base de datos
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- ============================================================
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  currency    TEXT NOT NULL DEFAULT 'USD',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: categories
-- type distingue si es para income, expense o ambos
-- is_default marca las categorías seed del sistema
-- ============================================================
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  color       TEXT NOT NULL DEFAULT '#6366f1',
  icon        TEXT NOT NULL DEFAULT 'tag',
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: incomes
-- ============================================================
CREATE TABLE incomes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount       DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description  TEXT,
  date         DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: expenses
-- is_fixed distingue gastos fijos (alquiler) de variables (comida)
-- ============================================================
CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount       DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  description  TEXT,
  date         DATE NOT NULL,
  is_fixed     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: goals (objetivos financieros)
-- ============================================================
CREATE TABLE goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  target_amount  DECIMAL(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  target_date    DATE,
  color          TEXT NOT NULL DEFAULT '#6366f1',
  icon           TEXT NOT NULL DEFAULT 'target',
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: budgets (presupuestos/reservas por categoría)
-- ============================================================
CREATE TABLE budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  amount       DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  period       TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'weekly', 'yearly')),
  color        TEXT NOT NULL DEFAULT '#6366f1',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para queries frecuentes
-- ============================================================
CREATE INDEX idx_incomes_user_date  ON incomes(user_id, date DESC);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_goals_user_status  ON goals(user_id, status);
CREATE INDEX idx_budgets_user       ON budgets(user_id);
CREATE INDEX idx_categories_user    ON categories(user_id, type);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Seguridad por usuario
-- ============================================================
ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets    ENABLE ROW LEVEL SECURITY;

-- Policies: cada usuario solo accede a sus propios datos
CREATE POLICY "users_own_profile"     ON profiles     FOR ALL USING (auth.uid() = id);
CREATE POLICY "users_own_categories"  ON categories   FOR ALL USING (auth.uid() = user_id OR is_default = TRUE);
CREATE POLICY "users_own_incomes"     ON incomes      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_expenses"    ON expenses     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_goals"       ON goals        FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_budgets"     ON budgets      FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- FUNCIÓN: crear profile y categorías por defecto al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');

  -- Categorías de ingreso por defecto
  INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Salario',         'income',  '#10b981', 'briefcase', TRUE),
    (NEW.id, 'Freelance',       'income',  '#6366f1', 'laptop',    TRUE),
    (NEW.id, 'Inversiones',     'income',  '#f59e0b', 'trending-up', TRUE),
    (NEW.id, 'Otros ingresos',  'income',  '#3b82f6', 'plus-circle', TRUE);

  -- Categorías de gasto por defecto
  INSERT INTO categories (user_id, name, type, color, icon, is_default) VALUES
    (NEW.id, 'Vivienda',        'expense', '#ef4444', 'home',       TRUE),
    (NEW.id, 'Alimentación',    'expense', '#f59e0b', 'shopping-cart', TRUE),
    (NEW.id, 'Transporte',      'expense', '#3b82f6', 'car',        TRUE),
    (NEW.id, 'Salud',           'expense', '#10b981', 'heart',      TRUE),
    (NEW.id, 'Ocio',            'expense', '#8b5cf6', 'music',      TRUE),
    (NEW.id, 'Educación',       'expense', '#06b6d4', 'book',       TRUE),
    (NEW.id, 'Ropa',            'expense', '#ec4899', 'shirt',      TRUE),
    (NEW.id, 'Pareja',          'expense', '#f43f5e', 'heart',      TRUE),
    (NEW.id, 'Regalos',         'expense', '#a855f7', 'gift',       TRUE),
    (NEW.id, 'Otros gastos',    'expense', '#64748b', 'more-horizontal', TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
