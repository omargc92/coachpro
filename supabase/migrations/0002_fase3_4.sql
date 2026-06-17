-- ============================================================
-- CoachPro — Fase 3/4: RPC extra del portal + políticas de Storage
-- Ejecutar DESPUÉS de 0001_init.sql.
-- ============================================================

-- ------------------------------------------------------------
-- portal_sesion_hoy: sets registrados hoy (para marcar checks en "Hoy")
-- ------------------------------------------------------------
create or replace function portal_sesion_hoy(p_token uuid, p_fecha date default current_date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_at atletas;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'ejercicio_id', ss.ejercicio_id,
      'serie_num', ss.serie_num,
      'reps_hechas', ss.reps_hechas,
      'peso_hecho_kg', ss.peso_hecho_kg,
      'completada', ss.completada))
    from sesiones s
    join sesion_sets ss on ss.sesion_id = s.id
    where s.atleta_id = v_at.id and s.fecha = p_fecha), '[]'::jsonb);
end $$;

-- ------------------------------------------------------------
-- portal_historial: datos crudos por día (últimos N días) para que
-- el cliente calcule el Score de Disciplina diario y la racha.
-- ------------------------------------------------------------
create or replace function portal_historial(p_token uuid, p_dias int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_at atletas; v_res jsonb;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;

  select coalesce(jsonb_agg(row order by row->>'fecha'), '[]'::jsonb) into v_res
  from (
    select jsonb_build_object(
      'fecha', (g.d::date)::text,
      'asistio',
        exists(select 1 from asistencias a where a.atleta_id = v_at.id and a.fecha = g.d::date)
        or exists(select 1 from sesiones s where s.atleta_id = v_at.id and s.fecha = g.d::date),
      'sets_planeados', coalesce((
        select sum(re.series)
        from asignaciones asg
        join rutina_ejercicios re on re.rutina_id = asg.rutina_id
        where asg.atleta_id = v_at.id and asg.activa
          and asg.dia_semana = extract(isodow from g.d)::int), 0),
      'sets_hechos', coalesce((
        select count(*)
        from sesiones s
        join sesion_sets ss on ss.sesion_id = s.id
        where s.atleta_id = v_at.id and s.fecha = g.d::date and ss.completada), 0),
      'kcal_meta', (select o.kcal from objetivos_nutricion o
                    where o.atleta_id = v_at.id and o.vigente_desde <= g.d::date
                    order by o.vigente_desde desc limit 1),
      'prot_meta', (select o.proteina_g from objetivos_nutricion o
                    where o.atleta_id = v_at.id and o.vigente_desde <= g.d::date
                    order by o.vigente_desde desc limit 1),
      'kcal_cons', coalesce((select sum(kcal) from comidas c where c.atleta_id = v_at.id and c.fecha = g.d::date), 0),
      'prot_cons', coalesce((select sum(proteina_g) from comidas c where c.atleta_id = v_at.id and c.fecha = g.d::date), 0)
    ) as row
    from generate_series(current_date - (p_dias - 1), current_date, interval '1 day') as g(d)
  ) sub;
  return v_res;
end $$;

grant execute on function
  portal_sesion_hoy(uuid,date),
  portal_historial(uuid,int)
to anon;

-- ------------------------------------------------------------
-- Storage: bucket 'fotos' (crear manualmente en el dashboard).
-- El portal del atleta (anon) sube fotos de plato/progreso; el coach
-- (authenticated) las lee. Estas políticas permiten ese acceso.
-- NOTA: si el bucket es público, la lectura ya es libre por URL pública;
-- la política de INSERT es la imprescindible para subir sin login.
-- ------------------------------------------------------------
do $$
begin
  -- subir
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='fotos_insert') then
    create policy fotos_insert on storage.objects
      for insert to anon, authenticated
      with check (bucket_id = 'fotos');
  end if;
  -- leer
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='fotos_select') then
    create policy fotos_select on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'fotos');
  end if;
end $$;
