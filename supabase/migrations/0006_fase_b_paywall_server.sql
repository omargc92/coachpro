-- ============================================================
-- Fase B (cont.) — Enforcement SERVER-SIDE del paywall
-- ------------------------------------------------------------
-- El gating de planes vivía solo en el cliente (src/lib/usePlan.jsx),
-- así que un coach read_only/expirado —o uno por encima de su límite
-- de atletas— podía saltarse el paywall llamando la API REST directo.
-- Esta migración lo hace cumplir en la base:
--   1) coach_can_write(): plan efectivo (trial expira por tiempo).
--   2) Policies RESTRICTIVE de escritura en las tablas de datos del coach.
--   3) Trigger que limita el alta de atletas por plan.
--
-- IDEMPOTENTE: se puede re-ejecutar sin error.
-- Las escrituras del PORTAL DEL ATLETA usan RPCs security definer
-- (bypassan RLS), así que NO se ven afectadas por estas policies.
-- ============================================================

-- 1) ¿El coach autenticado puede escribir ahora mismo?
--    read_only = status read_only  OR  plan expired  OR  trial vencido.
create or replace function coach_can_write()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions s
    where s.coach_id = current_coach_id()
      and s.status = 'active'
      and s.plan <> 'expired'
      and not (s.plan = 'trial' and now() > s.trial_ends_at)
  )
$$;

-- 2) Gate de escritura (insert/update/delete) en las tablas del coach.
--    RESTRICTIVE → se aplica en AND con las policies _own de propiedad,
--    sin tocar el SELECT (read_only sigue pudiendo LEER sus datos).
do $$
declare
  t text;
  tbls text[] := array[
    'atletas','mediciones','ejercicios','rutinas','rutina_ejercicios',
    'asignaciones','sesiones','sesion_sets','asistencias',
    'objetivos_nutricion','comidas','mensajes'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists %I on %I', t || '_wg_ins', t);
    execute format('drop policy if exists %I on %I', t || '_wg_upd', t);
    execute format('drop policy if exists %I on %I', t || '_wg_del', t);
    execute format(
      'create policy %I on %I as restrictive for insert to authenticated with check (coach_can_write())',
      t || '_wg_ins', t);
    execute format(
      'create policy %I on %I as restrictive for update to authenticated using (coach_can_write())',
      t || '_wg_upd', t);
    execute format(
      'create policy %I on %I as restrictive for delete to authenticated using (coach_can_write())',
      t || '_wg_del', t);
  end loop;
end $$;

-- 3) Límite de atletas por plan (debe coincidir con src/lib/plans.js).
--    trial = 3 · pro = 25 · premium = ∞ · expired = 0.
create or replace function enforce_athlete_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan  plan_t;
  v_ends  timestamptz;
  v_max   int;
  v_count int;
begin
  select plan, trial_ends_at into v_plan, v_ends
    from subscriptions where coach_id = new.coach_id;
  if not found then
    v_plan := 'trial';               -- coach sin fila aún → límite de trial
  end if;

  if v_plan = 'trial' and v_ends is not null and now() > v_ends then
    v_plan := 'expired';             -- trial vencido
  end if;

  v_max := case v_plan
    when 'trial'   then 3
    when 'pro'     then 25
    when 'premium' then 2147483647   -- ∞ práctico
    else 0                           -- expired
  end;

  select count(*) into v_count
    from atletas where coach_id = new.coach_id and activo = true;

  if v_count >= v_max then
    raise exception 'Límite de atletas del plan % alcanzado (máx %). Actualiza tu plan.', v_plan, v_max
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists atletas_limit_before_insert on atletas;
create trigger atletas_limit_before_insert
  before insert on atletas
  for each row execute function enforce_athlete_limit();
