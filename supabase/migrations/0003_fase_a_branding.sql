-- ============================================================
-- Fase A — Branding por coach
-- ============================================================

-- 1) Nuevas columnas en coaches
alter table coaches
  add column if not exists logo_url      text,
  add column if not exists brand_primary text,
  add column if not exists brand_accent  text;

-- 2) Bucket coach-logos (público de lectura)
insert into storage.buckets (id, name, public)
values ('coach-logos', 'coach-logos', true)
on conflict (id) do nothing;

-- 3) RLS del bucket: solo el coach dueño puede subir/borrar su logo
--    El path debe ser {coach_id}/logo.{ext}
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

-- 4) RPC pública: branding del coach dueño del atleta (para el portal)
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
