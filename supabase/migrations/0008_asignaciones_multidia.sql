-- ============================================================
-- Migración 0008 — Asignación de rutina a varios días
-- ============================================================
-- El UI ahora permite asignar una rutina a varios días de una vez.
-- Semántica: una sola rutina activa por (atleta, día). Este índice
-- blinda esa regla, que hasta ahora solo dependía de la app.
-- ============================================================

-- 1. Dedup previo: si un atleta tuviera varias asignaciones ACTIVAS el
--    mismo día (posible porque antes no había constraint), conserva la
--    más reciente y desactiva las demás para no romper el índice único.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY atleta_id, dia_semana
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM asignaciones
  WHERE activa
)
UPDATE asignaciones a
SET activa = false
FROM ranked r
WHERE a.id = r.id AND r.rn > 1;

-- 2. Índice único parcial: máximo una asignación activa por atleta y día.
CREATE UNIQUE INDEX IF NOT EXISTS asignaciones_atleta_dia_activa_uidx
  ON asignaciones (atleta_id, dia_semana)
  WHERE activa;
