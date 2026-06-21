-- ============================================================
-- Fase D — flag de onboarding del coach
-- ============================================================
alter table coaches
  add column if not exists onboarding_completado boolean not null default false;
