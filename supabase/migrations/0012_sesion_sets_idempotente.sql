-- ============================================================
-- Migración 0012 — Registro de sets idempotente (soporte offline)
-- ------------------------------------------------------------
-- Con la cola offline, un mismo set podría reenviarse (reintento tras
-- reconexión, doble toque sin red). Hacemos portal_registrar_set
-- idempotente por (sesión, ejercicio, serie) para no duplicar filas.
-- IDEMPOTENTE.
-- ============================================================

-- 1) Dedup previo por si existieran duplicados, y clave única.
delete from sesion_sets a using sesion_sets b
  where a.ctid < b.ctid
    and a.sesion_id = b.sesion_id
    and a.ejercicio_id = b.ejercicio_id
    and a.serie_num = b.serie_num;

create unique index if not exists sesion_sets_ses_ej_serie_uidx
  on sesion_sets (sesion_id, ejercicio_id, serie_num);

-- 2) RPC idempotente: si la serie ya existe, actualiza en vez de duplicar.
create or replace function portal_registrar_set(
  p_token uuid, p_ejercicio_id uuid, p_serie_num int,
  p_reps int, p_peso numeric, p_rutina_id uuid default null,
  p_fecha date default current_date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_at atletas; v_ses uuid; v_set uuid;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;

  select id into v_ses from sesiones where atleta_id = v_at.id and fecha = p_fecha limit 1;
  if v_ses is null then
    insert into sesiones(atleta_id, rutina_id, fecha) values (v_at.id, p_rutina_id, p_fecha)
    returning id into v_ses;
  end if;

  insert into sesion_sets(sesion_id, ejercicio_id, serie_num, reps_hechas, peso_hecho_kg, completada)
  values (v_ses, p_ejercicio_id, p_serie_num, p_reps, p_peso, true)
  on conflict (sesion_id, ejercicio_id, serie_num)
    do update set reps_hechas = excluded.reps_hechas,
                  peso_hecho_kg = excluded.peso_hecho_kg,
                  completada = true
  returning id into v_set;
  return v_set;
end $$;

grant execute on function portal_registrar_set(uuid,uuid,int,int,numeric,uuid,date) to anon;
