-- ============================================================
-- Migración 0014 — Nombre de la app configurable por el coach
-- ------------------------------------------------------------
-- El coach puede elegir el nombre que se muestra (cuando no hay logo) en
-- su panel y en el portal del atleta. Se guarda en coaches.brand_name y
-- se expone al portal vía portal_branding.
-- IDEMPOTENTE.
-- ============================================================

alter table coaches
  add column if not exists brand_name text;

-- portal_branding: agrega brand_name (mantiene chat_enabled/export_pdf de 0013).
create or replace function portal_branding(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_at    atletas;
  v_coach coaches;
  v_plan  plan_t;
  v_ends  timestamptz;
  v_chat  boolean;
  v_pdf   boolean;
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
  v_pdf  := v_plan = 'premium';

  return jsonb_build_object(
    'logo_url',      v_coach.logo_url,
    'brand_name',    v_coach.brand_name,
    'brand_primary', v_coach.brand_primary,
    'brand_accent',  v_coach.brand_accent,
    'chat_enabled',  v_chat,
    'export_pdf',    v_pdf
  );
end $$;

grant execute on function portal_branding(uuid) to anon;
