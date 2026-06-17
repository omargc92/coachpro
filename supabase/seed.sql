-- ============================================================
-- CoachPro — datos demo
-- ------------------------------------------------------------
-- REQUISITO PREVIO: el usuario coach debe existir en auth.users.
-- Crea uno desde la app (pantalla de login → "crear cuenta") o
-- desde el dashboard: Authentication → Users → Add user.
--
-- Luego ajusta el email de abajo al del coach y ejecuta este script
-- en el SQL Editor de Supabase. Es idempotente para el coach (no
-- duplica), pero re-ejecutar inserta atletas/datos demo de nuevo;
-- corre el seed una sola vez sobre una base limpia.
-- ============================================================

do $$
declare
  v_email   text := 'coach@coachpro.app';   -- <<< CAMBIA por el email del coach creado en Auth
  v_uid     uuid;
  v_coach   uuid;
  a_ana     uuid;
  a_luis    uuid;
  a_marta   uuid;
  e_sent    uuid; e_press uuid; e_jalon uuid; e_curl  uuid;
  e_remo    uuid; e_peso  uuid; e_zanc  uuid; e_plancha uuid;
  r_full    uuid;
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'No existe auth.users con email %, créalo primero en Authentication → Users.', v_email;
  end if;

  -- Coach (idempotente por auth_user_id)
  insert into coaches (email, nombre, auth_user_id)
  values (v_email, 'Entrenador Demo', v_uid)
  on conflict (auth_user_id) do update set email = excluded.email
  returning id into v_coach;

  -- ---------- ATLETAS ----------
  insert into atletas (coach_id, nombre, telefono, objetivo, fecha_inicio, notas)
  values (v_coach, 'Ana Reyes',  '+52 55 1111 1111', 'perdida_grasa', current_date - 40, 'Constante, viaja los viernes.')
  returning id into a_ana;

  insert into atletas (coach_id, nombre, telefono, objetivo, fecha_inicio, notas)
  values (v_coach, 'Luis Mora',  '+52 55 2222 2222', 'hipertrofia', current_date - 90, 'Quiere subir banca.')
  returning id into a_luis;

  insert into atletas (coach_id, nombre, telefono, objetivo, fecha_inicio, notas)
  values (v_coach, 'Marta Díaz', '+52 55 3333 3333', 'recomposicion', current_date - 15, 'Empezó hace poco.')
  returning id into a_marta;

  -- ---------- EJERCICIOS (catálogo) ----------
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Sentadilla',         'Piernas')  returning id into e_sent;
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Press banca',        'Pecho')    returning id into e_press;
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Jalón al pecho',     'Espalda')  returning id into e_jalon;
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Curl bíceps',        'Brazos')   returning id into e_curl;
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Remo con barra',     'Espalda')  returning id into e_remo;
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Peso muerto',        'Piernas')  returning id into e_peso;
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Zancadas',           'Piernas')  returning id into e_zanc;
  insert into ejercicios (coach_id, nombre, grupo_muscular) values
    (v_coach, 'Plancha',            'Core')     returning id into e_plancha;

  -- ---------- RUTINA ----------
  insert into rutinas (coach_id, nombre, descripcion)
  values (v_coach, 'Full Body A', 'Rutina de cuerpo completo, 3x semana.')
  returning id into r_full;

  insert into rutina_ejercicios (rutina_id, ejercicio_id, orden, series, reps, peso_kg, descanso_seg) values
    (r_full, e_sent,    1, 4, 8,  60, 120),
    (r_full, e_press,   2, 4, 8,  40, 120),
    (r_full, e_remo,    3, 3, 10, 35, 90),
    (r_full, e_jalon,   4, 3, 12, 45, 90),
    (r_full, e_curl,    5, 3, 12, 12, 60),
    (r_full, e_plancha, 6, 3, 1,  null, 60);

  -- Asignaciones: lunes(1), miércoles(3), viernes(5) a los 3 atletas
  insert into asignaciones (atleta_id, rutina_id, dia_semana, activa)
  select a.id, r_full, d.dia, true
  from (values (a_ana),(a_luis),(a_marta)) as a(id)
  cross join (values (1),(3),(5)) as d(dia);

  -- ---------- OBJETIVOS DE NUTRICIÓN ----------
  insert into objetivos_nutricion (atleta_id, kcal, proteina_g, carbos_g, grasas_g) values
    (a_ana,  1700, 130, 150, 55),
    (a_luis, 2600, 180, 280, 75),
    (a_marta,2000, 150, 180, 65);

  -- ---------- MEDICIONES (tendencia) ----------
  insert into mediciones (atleta_id, fecha, peso_kg, grasa_pct, cintura_cm) values
    (a_ana, current_date - 40, 72.0, 31.0, 86),
    (a_ana, current_date - 26, 70.8, 30.1, 84),
    (a_ana, current_date - 12, 69.6, 29.0, 82),
    (a_ana, current_date - 2,  68.9, 28.4, 81),
    (a_luis, current_date - 60, 78.0, 18.0, 84),
    (a_luis, current_date - 30, 79.5, 17.5, 84),
    (a_luis, current_date - 5,  81.0, 17.0, 85),
    (a_marta, current_date - 12, 64.0, 27.0, 78),
    (a_marta, current_date - 2,  63.6, 26.6, 77);

  -- ---------- ASISTENCIAS (últimos días) ----------
  insert into asistencias (atleta_id, fecha, presente) values
    (a_ana, current_date,     true),
    (a_ana, current_date - 2, true),
    (a_ana, current_date - 4, true),
    (a_luis, current_date - 1, true),
    (a_luis, current_date - 3, true);
  -- Marta sin asistencias recientes (para ver la alerta de riesgo)

  -- ---------- COMIDAS de hoy (Ana) ----------
  insert into comidas (atleta_id, fecha, momento, descripcion, kcal, proteina_g, carbos_g, grasas_g) values
    (a_ana, current_date, 'desayuno', 'Avena con claras y fruta', 380, 30, 45, 8),
    (a_ana, current_date, 'comida',   'Pollo, arroz y ensalada',  620, 48, 60, 18);

  -- ---------- MENSAJES ----------
  insert into mensajes (atleta_id, autor, texto, leido) values
    (a_ana, 'coach',  '¡Bien la semana! Sube 2.5kg en sentadilla.', true),
    (a_ana, 'atleta', 'Listo, hoy lo pruebo 💪', false),
    (a_marta,'coach', 'Te espero esta semana, no aflojes.', false);

  raise notice 'Seed completado. Coach: %  | Atletas: Ana, Luis, Marta', v_coach;
  raise notice 'Tokens de portal (abre /?token=...):';
  raise notice '  Ana:   %', (select token from atletas where id = a_ana);
  raise notice '  Luis:  %', (select token from atletas where id = a_luis);
  raise notice '  Marta: %', (select token from atletas where id = a_marta);
end $$;
