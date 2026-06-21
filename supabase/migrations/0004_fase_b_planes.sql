-- ============================================================
-- Fase B — Modelo de planes y suscripción
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

-- El coach solo puede LEER su propia suscripción.
-- Escritura reservada al service role / Edge Functions.
create policy "subs_select" on subscriptions
  for select to authenticated
  using (coach_id = current_coach_id());

-- Trigger: inicializa trial al crear un coach nuevo
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

-- Inicializa coaches existentes sin suscripción
insert into subscriptions (coach_id)
select id from coaches
on conflict (coach_id) do nothing;
