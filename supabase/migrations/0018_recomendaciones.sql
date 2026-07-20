-- ============================================================
-- Migración 0018 — Recomendaciones específicas del atleta
-- ------------------------------------------------------------
-- Nueva sección (debajo de nutrición): el coach escribe recomendaciones
-- específicas para cada atleta (texto libre) y el atleta las consulta de
-- forma informativa, igual que el menú.
--
-- Vive en la propia fila del atleta y se reemplaza cuando el coach la edita.
-- IDEMPOTENTE.
-- ============================================================

-- 1) Recomendaciones vigentes del atleta (texto libre escrito por el coach).
alter table atletas add column if not exists recomendaciones text;

-- 2) portal_nutricion ahora incluye también las recomendaciones vigentes.
--    Se conserva 'comidas'/'consumido' por compatibilidad histórica
--    (el portal ya no los usa, pero no rompemos datos previos).
create or replace function portal_nutricion(p_token uuid, p_fecha date default current_date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_at atletas; v_res jsonb;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;

  select jsonb_build_object(
    'objetivo', (select to_jsonb(o) from objetivos_nutricion o
                 where o.atleta_id = v_at.id and o.vigente_desde <= p_fecha
                 order by o.vigente_desde desc limit 1),
    'menu', v_at.menu_nutricion,
    'recomendaciones', v_at.recomendaciones,
    'comidas', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at)
                 from comidas c where c.atleta_id = v_at.id and c.fecha = p_fecha), '[]'::jsonb),
    'consumido', (select jsonb_build_object(
                   'kcal', coalesce(sum(kcal),0), 'proteina_g', coalesce(sum(proteina_g),0),
                   'carbos_g', coalesce(sum(carbos_g),0), 'grasas_g', coalesce(sum(grasas_g),0))
                 from comidas where atleta_id = v_at.id and fecha = p_fecha)
  ) into v_res;
  return v_res;
end $$;
