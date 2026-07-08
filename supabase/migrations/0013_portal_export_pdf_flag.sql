-- ============================================================
-- Migración 0013 — portal_branding expone `export_pdf`
-- ------------------------------------------------------------
-- El export a PDF es una feature Premium (ver plans.js / exportPdf.js).
-- El botón "Descargar mi resumen" del portal del atleta no tenía forma de
-- validar el plan (el portal solo recibía branding). Exponemos el flag
-- para no filtrar una feature monetizada a planes inferiores.
--   export_pdf = true solo cuando el plan efectivo del coach es 'premium'.
-- IDEMPOTENTE.
-- ============================================================

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
    'brand_primary', v_coach.brand_primary,
    'brand_accent',  v_coach.brand_accent,
    'chat_enabled',  v_chat,
    'export_pdf',    v_pdf
  );
end $$;

grant execute on function portal_branding(uuid) to anon;
