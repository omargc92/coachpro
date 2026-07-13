-- ============================================================
-- 0017 — Edad del atleta (vía fecha de nacimiento) + estatura por medición.
-- ------------------------------------------------------------
-- La edad se calcula en el cliente a partir de fecha_nacimiento (se mantiene
-- correcta con el tiempo). La estatura se captura en cada medición para poder
-- derivar IMC y seguir su evolución. Ambas columnas son opcionales, así que
-- los atletas y mediciones existentes no se ven afectados.
-- ============================================================

alter table atletas
  add column if not exists fecha_nacimiento date;

alter table mediciones
  add column if not exists estatura_cm numeric(5,1);
