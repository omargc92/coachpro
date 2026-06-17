-- ============================================================
-- CoachPro — esquema inicial (tablas + enums + RLS + RPC)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- ENUMS ----------
create type objetivo_t  as enum ('perdida_grasa','hipertrofia','recomposicion','mantenimiento');
create type momento_t   as enum ('desayuno','comida','cena','snack');
create type autor_t      as enum ('coach','atleta');

-- ============================================================
-- TABLAS
-- ============================================================

create table coaches (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  nombre        text not null,
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create table atletas (
  id            uuid primary key default gen_random_uuid(),
  coach_id      uuid not null references coaches(id) on delete cascade,
  nombre        text not null,
  telefono      text,
  objetivo      objetivo_t not null default 'mantenimiento',
  fecha_inicio  date not null default current_date,
  token         uuid not null unique default gen_random_uuid(),
  activo        boolean not null default true,
  notas         text,
  created_at    timestamptz not null default now()
);
create index on atletas (coach_id);
create index on atletas (token);

create table mediciones (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references atletas(id) on delete cascade,
  fecha       date not null default current_date,
  peso_kg     numeric(5,2) not null,
  grasa_pct   numeric(4,1),
  cintura_cm  numeric(5,1),
  pecho_cm    numeric(5,1),
  brazo_cm    numeric(5,1),
  pierna_cm   numeric(5,1),
  created_at  timestamptz not null default now()
);
create index on mediciones (atleta_id, fecha);

create table ejercicios (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references coaches(id) on delete cascade,
  nombre          text not null,
  grupo_muscular  text not null,
  gif_url         text,
  created_at      timestamptz not null default now()
);
create index on ejercicios (coach_id);

create table rutinas (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references coaches(id) on delete cascade,
  nombre      text not null,
  descripcion text,
  created_at  timestamptz not null default now()
);
create index on rutinas (coach_id);

create table rutina_ejercicios (
  id            uuid primary key default gen_random_uuid(),
  rutina_id     uuid not null references rutinas(id) on delete cascade,
  ejercicio_id  uuid not null references ejercicios(id) on delete restrict,
  orden         int not null default 0,
  series        int not null default 3,
  reps          int not null default 10,
  peso_kg       numeric(6,2),
  descanso_seg  int not null default 90,
  created_at    timestamptz not null default now()
);
create index on rutina_ejercicios (rutina_id, orden);

create table asignaciones (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references atletas(id) on delete cascade,
  rutina_id   uuid not null references rutinas(id) on delete cascade,
  dia_semana  int not null check (dia_semana between 1 and 7),
  activa      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index on asignaciones (atleta_id, dia_semana);

create table sesiones (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references atletas(id) on delete cascade,
  rutina_id   uuid references rutinas(id) on delete set null,
  fecha       date not null default current_date,
  completada  boolean not null default false,
  notas       text,
  created_at  timestamptz not null default now()
);
create index on sesiones (atleta_id, fecha);

create table sesion_sets (
  id            uuid primary key default gen_random_uuid(),
  sesion_id     uuid not null references sesiones(id) on delete cascade,
  ejercicio_id  uuid not null references ejercicios(id) on delete restrict,
  serie_num     int not null,
  reps_hechas   int,
  peso_hecho_kg numeric(6,2),
  completada    boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on sesion_sets (sesion_id);

create table asistencias (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references atletas(id) on delete cascade,
  fecha       date not null default current_date,
  presente    boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (atleta_id, fecha)
);
create index on asistencias (atleta_id, fecha);

create table objetivos_nutricion (
  id             uuid primary key default gen_random_uuid(),
  atleta_id      uuid not null references atletas(id) on delete cascade,
  kcal           int not null,
  proteina_g     int not null,
  carbos_g       int not null,
  grasas_g       int not null,
  vigente_desde  date not null default current_date,
  created_at     timestamptz not null default now()
);
create index on objetivos_nutricion (atleta_id, vigente_desde);

create table comidas (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references atletas(id) on delete cascade,
  fecha       date not null default current_date,
  momento     momento_t not null,
  descripcion text,
  kcal        int not null default 0,
  proteina_g  int not null default 0,
  carbos_g    int not null default 0,
  grasas_g    int not null default 0,
  foto_url    text,
  created_at  timestamptz not null default now()
);
create index on comidas (atleta_id, fecha);

create table mensajes (
  id          uuid primary key default gen_random_uuid(),
  atleta_id   uuid not null references atletas(id) on delete cascade,
  autor       autor_t not null,
  texto       text not null,
  leido       boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on mensajes (atleta_id, created_at);

-- ============================================================
-- RLS — el coach autenticado solo ve/gestiona SUS filas.
-- El rol anon NO accede a tablas directo (solo vía RPC).
-- ============================================================

alter table coaches             enable row level security;
alter table atletas             enable row level security;
alter table mediciones          enable row level security;
alter table ejercicios          enable row level security;
alter table rutinas             enable row level security;
alter table rutina_ejercicios   enable row level security;
alter table asignaciones        enable row level security;
alter table sesiones            enable row level security;
alter table sesion_sets         enable row level security;
alter table asistencias         enable row level security;
alter table objetivos_nutricion enable row level security;
alter table comidas             enable row level security;
alter table mensajes            enable row level security;

-- helper: id del coach autenticado actual
create or replace function current_coach_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from coaches where auth_user_id = auth.uid()
$$;

-- coaches: cada coach ve/edita su propia fila
create policy coach_self on coaches
  for all to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- atletas: pertenecen al coach
create policy atletas_own on atletas
  for all to authenticated
  using (coach_id = current_coach_id())
  with check (coach_id = current_coach_id());

-- ejercicios / rutinas: por coach_id directo
create policy ejercicios_own on ejercicios
  for all to authenticated
  using (coach_id = current_coach_id()) with check (coach_id = current_coach_id());

create policy rutinas_own on rutinas
  for all to authenticated
  using (coach_id = current_coach_id()) with check (coach_id = current_coach_id());

-- tablas hijas de atleta: el atleta debe pertenecer al coach
create policy mediciones_own on mediciones
  for all to authenticated
  using (atleta_id in (select id from atletas where coach_id = current_coach_id()))
  with check (atleta_id in (select id from atletas where coach_id = current_coach_id()));

create policy asignaciones_own on asignaciones
  for all to authenticated
  using (atleta_id in (select id from atletas where coach_id = current_coach_id()))
  with check (atleta_id in (select id from atletas where coach_id = current_coach_id()));

create policy sesiones_own on sesiones
  for all to authenticated
  using (atleta_id in (select id from atletas where coach_id = current_coach_id()))
  with check (atleta_id in (select id from atletas where coach_id = current_coach_id()));

create policy asistencias_own on asistencias
  for all to authenticated
  using (atleta_id in (select id from atletas where coach_id = current_coach_id()))
  with check (atleta_id in (select id from atletas where coach_id = current_coach_id()));

create policy objnutri_own on objetivos_nutricion
  for all to authenticated
  using (atleta_id in (select id from atletas where coach_id = current_coach_id()))
  with check (atleta_id in (select id from atletas where coach_id = current_coach_id()));

create policy comidas_own on comidas
  for all to authenticated
  using (atleta_id in (select id from atletas where coach_id = current_coach_id()))
  with check (atleta_id in (select id from atletas where coach_id = current_coach_id()));

create policy mensajes_own on mensajes
  for all to authenticated
  using (atleta_id in (select id from atletas where coach_id = current_coach_id()))
  with check (atleta_id in (select id from atletas where coach_id = current_coach_id()));

-- rutina_ejercicios: vía rutina del coach
create policy rutejer_own on rutina_ejercicios
  for all to authenticated
  using (rutina_id in (select id from rutinas where coach_id = current_coach_id()))
  with check (rutina_id in (select id from rutinas where coach_id = current_coach_id()));

-- sesion_sets: vía sesión de un atleta del coach
create policy sesionsets_own on sesion_sets
  for all to authenticated
  using (sesion_id in (
    select s.id from sesiones s
    join atletas a on a.id = s.atleta_id
    where a.coach_id = current_coach_id()))
  with check (sesion_id in (
    select s.id from sesiones s
    join atletas a on a.id = s.atleta_id
    where a.coach_id = current_coach_id()));

-- ============================================================
-- RPC del PORTAL DEL ATLETA (SECURITY DEFINER, acceso por token)
-- El rol anon ejecuta estas funciones; jamás toca tablas directo.
-- ============================================================

-- resuelve atleta por token (privada, helper)
create or replace function _atleta_por_token(p_token uuid)
returns atletas language sql stable security definer set search_path = public as $$
  select * from atletas where token = p_token and activo = true limit 1
$$;

-- 1) perfil + rutina del día (dia_semana 1=lunes..7=domingo)
create or replace function portal_perfil_y_rutina(p_token uuid, p_fecha date default current_date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_at atletas; v_dow int; v_res jsonb;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;
  v_dow := extract(isodow from p_fecha);  -- 1..7

  select jsonb_build_object(
    'atleta', to_jsonb(v_at) - 'token',
    'rutina', (
      select jsonb_build_object(
        'asignacion_id', asg.id,
        'rutina_id', r.id,
        'nombre', r.nombre,
        'ejercicios', coalesce((
          select jsonb_agg(jsonb_build_object(
            'rutina_ejercicio_id', re.id,
            'ejercicio_id', e.id,
            'nombre', e.nombre,
            'grupo_muscular', e.grupo_muscular,
            'gif_url', e.gif_url,
            'orden', re.orden,
            'series', re.series, 'reps', re.reps,
            'peso_kg', re.peso_kg, 'descanso_seg', re.descanso_seg
          ) order by re.orden)
          from rutina_ejercicios re join ejercicios e on e.id = re.ejercicio_id
          where re.rutina_id = r.id), '[]'::jsonb)
      )
      from asignaciones asg join rutinas r on r.id = asg.rutina_id
      where asg.atleta_id = v_at.id and asg.dia_semana = v_dow and asg.activa
      limit 1
    ),
    'asistio_hoy', exists(select 1 from asistencias where atleta_id = v_at.id and fecha = p_fecha)
  ) into v_res;
  return v_res;
end $$;

-- 2) registrar set (crea sesión del día si no existe)
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
  returning id into v_set;
  return v_set;
end $$;

-- 3) marcar asistencia del día
create or replace function portal_marcar_asistencia(p_token uuid, p_fecha date default current_date)
returns void language plpgsql security definer set search_path = public as $$
declare v_at atletas;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;
  insert into asistencias(atleta_id, fecha, presente) values (v_at.id, p_fecha, true)
  on conflict (atleta_id, fecha) do update set presente = true;
end $$;

-- 4) nutrición del día: objetivo vigente + comidas + consumido
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
    'comidas', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at)
                 from comidas c where c.atleta_id = v_at.id and c.fecha = p_fecha), '[]'::jsonb),
    'consumido', (select jsonb_build_object(
                   'kcal', coalesce(sum(kcal),0), 'proteina_g', coalesce(sum(proteina_g),0),
                   'carbos_g', coalesce(sum(carbos_g),0), 'grasas_g', coalesce(sum(grasas_g),0))
                 from comidas where atleta_id = v_at.id and fecha = p_fecha)
  ) into v_res;
  return v_res;
end $$;

-- 5) registrar comida
create or replace function portal_registrar_comida(
  p_token uuid, p_momento momento_t, p_descripcion text,
  p_kcal int, p_prot int, p_carb int, p_gra int,
  p_foto_url text default null, p_fecha date default current_date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_at atletas; v_id uuid;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;
  insert into comidas(atleta_id, fecha, momento, descripcion, kcal, proteina_g, carbos_g, grasas_g, foto_url)
  values (v_at.id, p_fecha, p_momento, p_descripcion, p_kcal, p_prot, p_carb, p_gra, p_foto_url)
  returning id into v_id;
  return v_id;
end $$;

-- 6) progreso (mediciones)
create or replace function portal_progreso(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_at atletas;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;
  return coalesce((select jsonb_agg(to_jsonb(m) order by m.fecha)
                   from mediciones m where m.atleta_id = v_at.id), '[]'::jsonb);
end $$;

-- 7) leer mensajes (marca como leídos los del coach)
create or replace function portal_leer_mensajes(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_at atletas; v_res jsonb;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;
  update mensajes set leido = true where atleta_id = v_at.id and autor = 'coach' and not leido;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]'::jsonb)
  into v_res from mensajes m where m.atleta_id = v_at.id;
  return v_res;
end $$;

-- 8) enviar mensaje (autor = atleta)
create or replace function portal_enviar_mensaje(p_token uuid, p_texto text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_at atletas; v_id uuid;
begin
  v_at := _atleta_por_token(p_token);
  if v_at.id is null then raise exception 'token invalido'; end if;
  insert into mensajes(atleta_id, autor, texto) values (v_at.id, 'atleta', p_texto)
  returning id into v_id;
  return v_id;
end $$;

-- permisos: anon solo ejecuta las RPC del portal
grant execute on function
  portal_perfil_y_rutina(uuid,date),
  portal_registrar_set(uuid,uuid,int,int,numeric,uuid,date),
  portal_marcar_asistencia(uuid,date),
  portal_nutricion(uuid,date),
  portal_registrar_comida(uuid,momento_t,text,int,int,int,int,text,date),
  portal_progreso(uuid),
  portal_leer_mensajes(uuid),
  portal_enviar_mensaje(uuid,text)
to anon;
