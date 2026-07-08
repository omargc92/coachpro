-- ============================================================
-- ⚠️  HISTÓRICO — NO es la fuente de verdad de migraciones.
-- ------------------------------------------------------------
-- Este bundle consolidó las Fases A/B/D + paywall (hasta 0006) para
-- ejecutarlas a mano en el SQL Editor cuando no se usaba el CLI.
-- HOY las migraciones se aplican con el CLI: `supabase db push`, y la
-- fuente de verdad son los archivos numerados 0001…NNNN de esta carpeta.
-- Este archivo NO incluye 0007+ y se conserva solo como referencia.
-- No lo re-ejecutes (create type/table/policy no son idempotentes).
-- ============================================================
-- CoachPro — Migraciones (Fases A, B, D + paywall server-side)
-- Orden: A → B → D → enforcement (no cambiar el orden)
-- ============================================================

begin;


-- ============================================================
-- FASE A — Branding por coach
-- ============================================================

-- Columnas de branding en la tabla coaches
alter table coaches
  add column if not exists logo_url      text,
  add column if not exists brand_primary text,
  add column if not exists brand_accent  text;

-- Bucket de storage para logos (público de lectura)
insert into storage.buckets (id, name, public)
values ('coach-logos', 'coach-logos', true)
on conflict (id) do nothing;

-- RLS del bucket: solo el coach dueño puede subir/borrar su logo
create policy "coach_logos_select"
  on storage.objects for select
  using (bucket_id = 'coach-logos');

create policy "coach_logos_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'coach-logos'
    and (storage.foldername(name))[1] = (
      select id::text from coaches where auth_user_id = auth.uid()
    )
  );

create policy "coach_logos_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'coach-logos'
    and (storage.foldername(name))[1] = (
      select id::text from coaches where auth_user_id = auth.uid()
    )
  );

-- RPC pública: branding del coach dueño del atleta (para el portal del atleta)
create or replace function portal_branding(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_at atletas; v_coach coaches;
begin
  select * into v_at from atletas where token = p_token and activo = true limit 1;
  if v_at.id is null then return '{}'::jsonb; end if;
  select * into v_coach from coaches where id = v_at.coach_id limit 1;
  return jsonb_build_object(
    'logo_url',      v_coach.logo_url,
    'brand_primary', v_coach.brand_primary,
    'brand_accent',  v_coach.brand_accent
  );
end $$;

grant execute on function portal_branding(uuid) to anon;


-- ============================================================
-- FASE B — Modelo de planes y suscripción
-- ============================================================

create type plan_t        as enum ('trial', 'expired', 'pro', 'premium');
create type plan_status_t as enum ('active', 'read_only');

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  coach_id               uuid not null unique references coaches(id) on delete cascade,
  plan                   plan_t not null default 'trial',
  status                 plan_status_t not null default 'active',
  trial_ends_at          timestamptz not null default (now() + interval '14 days'),
  current_period_end     timestamptz,
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index on subscriptions (coach_id);

alter table subscriptions enable row level security;

-- El coach solo puede LEER su propia suscripción
-- (escritura reservada al service role / Edge Functions de Stripe)
create policy "subs_select" on subscriptions
  for select to authenticated
  using (coach_id = current_coach_id());

-- Trigger: asigna plan trial automáticamente a cada coach nuevo
create or replace function init_coach_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into subscriptions (coach_id)
  values (new.id)
  on conflict (coach_id) do nothing;
  return new;
end $$;

create trigger after_coach_insert
  after insert on coaches
  for each row execute function init_coach_subscription();

-- Inicializa en trial a los coaches existentes que aún no tienen suscripción
insert into subscriptions (coach_id)
select id from coaches
on conflict (coach_id) do nothing;


-- ============================================================
-- FASE D — Onboarding del coach
-- ============================================================

alter table coaches
  add column if not exists onboarding_completado boolean not null default false;


-- ============================================================
-- FASE B (cont.) — Enforcement server-side del paywall
-- (idéntico a 0006_fase_b_paywall_server.sql)
-- ============================================================

-- 1) ¿El coach autenticado puede escribir ahora mismo?
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
    v_plan := 'trial';
  end if;

  if v_plan = 'trial' and v_ends is not null and now() > v_ends then
    v_plan := 'expired';
  end if;

  v_max := case v_plan
    when 'trial'   then 3
    when 'pro'     then 25
    when 'premium' then 2147483647
    else 0
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


commit;

-- ============================================================
-- FIN — Si todo corrió sin errores, las fases + el paywall server-side
-- están listas.
-- ============================================================
