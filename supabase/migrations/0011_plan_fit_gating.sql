-- ============================================================
-- Migración 0011 — Gating del plan 'fit'
-- ------------------------------------------------------------
--   1) Límite de atletas del plan 'fit' (debe coincidir con plans.js).
--   2) portal_branding expone `chat_enabled` para que el portal del
--      atleta oculte la asesoría (chat) cuando el coach es plan 'fit'
--      (o está expirado).
-- IDEMPOTENTE.
-- ============================================================

-- 1) Límite de atletas por plan — ahora incluye 'fit' = 10.
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
    when 'fit'     then 10
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

-- 2) portal_branding + chat_enabled (asesoría).
--    chat_enabled = false cuando el plan efectivo del coach es 'fit' o 'expired'.
create or replace function portal_branding(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_at    atletas;
  v_coach coaches;
  v_plan  plan_t;
  v_ends  timestamptz;
  v_chat  boolean;
begin
  select * into v_at from atletas where token = p_token and activo = true limit 1;
  if v_at.id is null then return '{}'::jsonb; end if;
  select * into v_coach from coaches where id = v_at.coach_id limit 1;

  select plan, trial_ends_at into v_plan, v_ends
    from subscriptions where coach_id = v_coach.id;
  if v_plan is null then v_plan := 'trial'; end if;
  if v_plan = 'trial' and v_ends is not null and now() > v_ends then
    v_plan := 'expired';
  end if;
  v_chat := v_plan not in ('fit', 'expired');

  return jsonb_build_object(
    'logo_url',      v_coach.logo_url,
    'brand_primary', v_coach.brand_primary,
    'brand_accent',  v_coach.brand_accent,
    'chat_enabled',  v_chat
  );
end $$;

grant execute on function portal_branding(uuid) to anon;
