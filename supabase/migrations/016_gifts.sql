-- ============================================================
-- GodMoney - Migración 016: Regalos (cumpleaños, Navidad y otras
-- ocasiones). Ejecutar en el SQL Editor de Supabase después de 015.
--
--   gift_people     personas a las que regalas (y su cumpleaños)
--   gift_occasions  fechas que se repiten cada año, con presupuesto,
--                   aviso previo y un objetivo de ahorro opcional
--   gifts           ideas, regalos planificados, comprados y recibidos
--
-- Un regalo comprado queda vinculado al gasto que lo registró
-- (expense_id) y un regalo en dinero recibido al ingreso (income_id),
-- así cuentan en presupuestos y reportes como cualquier movimiento.
-- ============================================================

CREATE TABLE gift_people (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  relationship TEXT,
  -- El año de nacimiento no hace falta para saber cuándo regalar.
  birth_month  INTEGER CHECK (birth_month BETWEEN 1 AND 12),
  birth_day    INTEGER CHECK (birth_day BETWEEN 1 AND 31),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((birth_month IS NULL) = (birth_day IS NULL))
);

CREATE INDEX idx_gift_people_user ON gift_people(user_id);
ALTER TABLE gift_people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_gift_people" ON gift_people FOR ALL USING (auth.uid() = user_id);

-- Las ocasiones se repiten cada año el mismo día (month/day). Para un
-- cumpleaños, month/day se copian del cumpleaños de la persona.
CREATE TABLE gift_occasions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  kind                 TEXT NOT NULL CHECK (kind IN ('BIRTHDAY', 'CHRISTMAS', 'ANNIVERSARY', 'OTHER')),
  person_id            UUID REFERENCES gift_people(id) ON DELETE CASCADE,
  month                INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  day                  INTEGER NOT NULL CHECK (day BETWEEN 1 AND 31),
  budget               DECIMAL(12, 2) CHECK (budget IS NULL OR budget > 0),
  reminder_days_before INTEGER NOT NULL DEFAULT 14 CHECK (reminder_days_before >= 0),
  goal_id              UUID REFERENCES goals(id) ON DELETE SET NULL,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (kind <> 'BIRTHDAY' OR person_id IS NOT NULL)
);

CREATE INDEX idx_gift_occasions_user ON gift_occasions(user_id, is_active);
ALTER TABLE gift_occasions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_gift_occasions" ON gift_occasions FOR ALL USING (auth.uid() = user_id);

-- direction GIVEN:    status IDEA → PLANNED (con ocasión y año) → DONE (comprado)
-- direction RECEIVED: siempre DONE; is_money indica si fue dinero.
-- year es el año de la ocasión al que pertenece el regalo (Navidad 2026).
CREATE TABLE gifts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direction        TEXT NOT NULL DEFAULT 'GIVEN' CHECK (direction IN ('GIVEN', 'RECEIVED')),
  status           TEXT NOT NULL DEFAULT 'IDEA' CHECK (status IN ('IDEA', 'PLANNED', 'DONE')),
  title            TEXT NOT NULL,
  person_id        UUID REFERENCES gift_people(id) ON DELETE SET NULL,
  occasion_id      UUID REFERENCES gift_occasions(id) ON DELETE SET NULL,
  year             INTEGER CHECK (year BETWEEN 2000 AND 2100),
  estimated_amount DECIMAL(12, 2) CHECK (estimated_amount IS NULL OR estimated_amount > 0),
  amount           DECIMAL(12, 2) CHECK (amount IS NULL OR amount > 0),
  is_money         BOOLEAN NOT NULL DEFAULT FALSE,
  date             DATE,
  url              TEXT,
  notes            TEXT,
  expense_id       UUID REFERENCES expenses(id) ON DELETE SET NULL,
  income_id        UUID REFERENCES incomes(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (direction = 'GIVEN' OR status = 'DONE')
);

CREATE INDEX idx_gifts_user ON gifts(user_id, status);
CREATE INDEX idx_gifts_occasion ON gifts(occasion_id, year) WHERE occasion_id IS NOT NULL;
CREATE INDEX idx_gifts_person ON gifts(person_id) WHERE person_id IS NOT NULL;
ALTER TABLE gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_gifts" ON gifts FOR ALL USING (auth.uid() = user_id);
