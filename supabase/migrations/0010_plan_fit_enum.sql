-- ============================================================
-- Migración 0010 — Nuevo plan 'fit' (valor del enum)
-- ============================================================
-- 'fit': plan de entrada. El atleta solo ve rutinas precargadas y
-- registra su avance; SIN asesoría (chat).
--
-- ⚠️  ADD VALUE debe commitear ANTES de que otras sentencias usen el
--     valor como literal. Por eso va SOLO en esta migración; la lógica
--     que lo usa (límite de atletas, gating del portal) va en la 0011.
-- ============================================================

ALTER TYPE plan_t ADD VALUE IF NOT EXISTS 'fit' BEFORE 'pro';
