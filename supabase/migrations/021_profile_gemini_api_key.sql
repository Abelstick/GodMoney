-- 021 — Clave de Gemini del usuario en su perfil
--
-- La app ya lee y escribe esta columna (profileService), pero ninguna migración
-- la creaba: se añadió a mano y una base nueva dejaba el asistente sin funcionar.
-- IF NOT EXISTS: en una base donde ya existe, esta migración no cambia nada.
--
-- Queda protegida por la RLS de profiles (cada usuario solo ve su fila), pero se
-- guarda sin cifrar y llega al navegador, porque el chat llama a Gemini desde ahí.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
