-- ============================================================
-- GodMoney - Migración 009: transferencias entre cuentas,
-- etiquetas, notas y adjuntos (Google Drive) en ingresos/gastos.
-- Ejecutar en el SQL Editor de Supabase.
-- ============================================================

-- ── Transferencias entre cuentas ──────────────────────────────
-- Mueven saldo de una cuenta a otra sin contar como ingreso ni gasto.
CREATE TABLE transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount           DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  date             DATE NOT NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_account_id <> to_account_id)
);

CREATE INDEX idx_transfers_user_date ON transfers(user_id, date DESC);

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_transfers" ON transfers FOR ALL USING (auth.uid() = user_id);

-- Ajusta los saldos al crear, borrar o editar una transferencia.
CREATE OR REPLACE FUNCTION sync_transfer_balances()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Revertir el efecto anterior
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE accounts SET balance = balance + OLD.amount, updated_at = NOW()
      WHERE id = OLD.from_account_id AND user_id = OLD.user_id;
    UPDATE accounts SET balance = balance - OLD.amount, updated_at = NOW()
      WHERE id = OLD.to_account_id AND user_id = OLD.user_id;
  END IF;

  -- Aplicar el efecto nuevo
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE accounts SET balance = balance - NEW.amount, updated_at = NOW()
      WHERE id = NEW.from_account_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cuenta de origen no encontrada';
    END IF;
    UPDATE accounts SET balance = balance + NEW.amount, updated_at = NOW()
      WHERE id = NEW.to_account_id AND user_id = NEW.user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cuenta de destino no encontrada';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_transfer_balances
  AFTER INSERT OR DELETE OR UPDATE OF amount, from_account_id, to_account_id ON transfers
  FOR EACH ROW EXECUTE FUNCTION sync_transfer_balances();

-- ── Etiquetas, notas y adjuntos en ingresos y gastos ──────────
-- attachments: [{ "id": "<driveFileId>", "name": "...", "mimeType": "...", "link": "https://drive.google.com/..." }]
ALTER TABLE expenses
  ADD COLUMN tags        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN notes       TEXT,
  ADD COLUMN attachments JSONB  NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE incomes
  ADD COLUMN tags        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN notes       TEXT,
  ADD COLUMN attachments JSONB  NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_expenses_tags ON expenses USING GIN (tags);
CREATE INDEX idx_incomes_tags  ON incomes  USING GIN (tags);
