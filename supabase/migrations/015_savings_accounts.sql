-- ============================================================
-- GodMoney - Migración 015: marcar cuentas como "de ahorro".
-- Ejecutar en el SQL Editor de Supabase después de 014.
--
-- Permite ofrecer "Lo voy a reponer" al transferir desde una cuenta de ahorro
-- y listar solo cuentas de ahorro al registrar una deuda con tu ahorro.
-- ============================================================

ALTER TABLE accounts ADD COLUMN is_savings BOOLEAN NOT NULL DEFAULT FALSE;
