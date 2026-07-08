-- ============================================================
-- Migración 0009 — RPC portal: rutina semanal completa del atleta
-- ============================================================
-- portal_perfil_y_rutina solo devuelve la rutina de HOY. Para que el
-- atleta pueda exportar su rutina completa a PDF, exponemos todas sus
-- asignaciones activas con sus ejercicios (series/reps/peso).
-- ============================================================

create or replace function portal_rutina_semanal(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_at atletas; v_res jsonb;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;

  select coalesce(jsonb_agg(dia order by dia_semana), '[]'::jsonb)
  into v_res
  from (
    select
      asg.dia_semana,
      jsonb_build_object(
        'dia_semana', asg.dia_semana,
        'nombre', r.nombre,
        'ejercicios', coalesce((
          select jsonb_agg(jsonb_build_object(
            'nombre', e.nombre,
            'series', re.series,
            'reps', re.reps,
            'peso_kg', re.peso_kg
          ) order by re.orden)
          from rutina_ejercicios re join ejercicios e on e.id = re.ejercicio_id
          where re.rutina_id = r.id
        ), '[]'::jsonb)
      ) as dia
    from asignaciones asg
    join rutinas r on r.id = asg.rutina_id
    where asg.atleta_id = v_at.id and asg.activa
  ) t;

  return v_res;
end $$;

grant execute on function portal_rutina_semanal(uuid) to anon;
