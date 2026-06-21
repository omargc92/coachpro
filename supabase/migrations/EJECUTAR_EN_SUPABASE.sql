-- ============================================================
-- CoachPro — Migraciones pendientes (Fases A, B y D)
-- Ejecutar completo en: Supabase Dashboard → SQL Editor
-- Orden: A → B → D (no cambiar el orden)
-- ============================================================


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
-- FIN — Si todo corrió sin errores, las 3 fases están listas.
-- ============================================================
