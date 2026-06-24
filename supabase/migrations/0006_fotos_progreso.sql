-- ============================================================
-- Migración 0006 — Fotos de progreso del atleta
-- ============================================================

CREATE TABLE IF NOT EXISTS fotos_progreso (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id  UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  foto_url   TEXT NOT NULL,
  nota       TEXT,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fotos_progreso ENABLE ROW LEVEL SECURITY;

-- Coach autenticado puede leer fotos de sus propios atletas
CREATE POLICY "coach_lee_fotos_progreso" ON fotos_progreso
  FOR SELECT TO authenticated
  USING (
    atleta_id IN (
      SELECT a.id FROM atletas a
      JOIN coaches c ON c.id = a.coach_id
      WHERE c.auth_user_id = auth.uid()
    )
  );

-- RPC: atleta registra una foto de progreso (acceso por token)
CREATE OR REPLACE FUNCTION portal_agregar_foto_progreso(
  p_token    UUID,
  p_foto_url TEXT,
  p_nota     TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_atleta_id UUID;
BEGIN
  SELECT id INTO v_atleta_id FROM atletas WHERE token = p_token AND activo = TRUE;
  IF v_atleta_id IS NULL THEN RAISE EXCEPTION 'token inválido'; END IF;
  INSERT INTO fotos_progreso (atleta_id, foto_url, nota, fecha)
  VALUES (v_atleta_id, p_foto_url, p_nota, CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: atleta lee su historial de fotos (acceso por token)
CREATE OR REPLACE FUNCTION portal_fotos_progreso(p_token UUID)
RETURNS TABLE(id UUID, foto_url TEXT, nota TEXT, fecha DATE) AS $$
DECLARE
  v_atleta_id UUID;
BEGIN
  SELECT id INTO v_atleta_id FROM atletas WHERE token = p_token AND activo = TRUE;
  IF v_atleta_id IS NULL THEN RAISE EXCEPTION 'token inválido'; END IF;
  RETURN QUERY
    SELECT fp.id, fp.foto_url, fp.nota, fp.fecha
    FROM fotos_progreso fp
    WHERE fp.atleta_id = v_atleta_id
    ORDER BY fp.fecha DESC, fp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
