-- ============================================================
-- CoachPro — Setup completo para proyecto Supabase
-- ============================================================
-- Pega y ejecuta esto en el SQL Editor de tu proyecto Supabase.
--
-- ANTES DE EJECUTAR:
--   Crea el usuario coach en Authentication → Users → Add user:
--   Email: coach@coachpro.test   Password: Demo1234!
--   Activa "Auto Confirm User".
--
-- TOKENS DEL PORTAL (para probar como atleta):
--   Ana:   /?token=11111111-1111-1111-1111-111111111111
--   Luis:  /?token=22222222-2222-2222-2222-222222222222
--   Marta: /?token=33333333-3333-3333-3333-333333333333
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN CREATE TYPE objetivo_t  AS ENUM ('perdida_grasa','hipertrofia','recomposicion','mantenimiento'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE momento_t   AS ENUM ('desayuno','comida','cena','snack'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE autor_t     AS ENUM ('coach','atleta'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE plan_t      AS ENUM ('trial','expired','pro','premium'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE plan_status_t AS ENUM ('active','read_only'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE IF NOT EXISTS coaches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL UNIQUE,
  nombre                TEXT NOT NULL,
  auth_user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url              TEXT,
  brand_primary         TEXT,
  brand_accent          TEXT,
  onboarding_completado BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atletas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id      UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL,
  telefono      TEXT,
  objetivo      objetivo_t NOT NULL DEFAULT 'mantenimiento',
  fecha_inicio  DATE NOT NULL DEFAULT CURRENT_DATE,
  token         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  activo        BOOLEAN NOT NULL DEFAULT true,
  notas         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS atletas_coach_idx ON atletas(coach_id);
CREATE INDEX IF NOT EXISTS atletas_token_idx ON atletas(token);

CREATE TABLE IF NOT EXISTS mediciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id  UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  peso_kg    NUMERIC(5,2) NOT NULL,
  grasa_pct  NUMERIC(4,1),
  cintura_cm NUMERIC(5,1),
  pecho_cm   NUMERIC(5,1),
  brazo_cm   NUMERIC(5,1),
  pierna_cm  NUMERIC(5,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mediciones_atleta_fecha_idx ON mediciones(atleta_id, fecha);

CREATE TABLE IF NOT EXISTS ejercicios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id       UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  grupo_muscular TEXT NOT NULL,
  gif_url        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ejercicios_coach_idx ON ejercicios(coach_id);

CREATE TABLE IF NOT EXISTS rutinas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  descripcion TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rutinas_coach_idx ON rutinas(coach_id);

CREATE TABLE IF NOT EXISTS rutina_ejercicios (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rutina_id    UUID NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
  orden        INT NOT NULL DEFAULT 0,
  series       INT NOT NULL DEFAULT 3,
  reps         INT NOT NULL DEFAULT 10,
  peso_kg      NUMERIC(6,2),
  descanso_seg INT NOT NULL DEFAULT 90,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rutina_ejercicios_rutina_idx ON rutina_ejercicios(rutina_id, orden);

CREATE TABLE IF NOT EXISTS asignaciones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id  UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  rutina_id  UUID NOT NULL REFERENCES rutinas(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  activa     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asignaciones_atleta_dia_idx ON asignaciones(atleta_id, dia_semana);

CREATE TABLE IF NOT EXISTS sesiones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id  UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  rutina_id  UUID REFERENCES rutinas(id) ON DELETE SET NULL,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  completada BOOLEAN NOT NULL DEFAULT false,
  notas      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sesiones_atleta_fecha_idx ON sesiones(atleta_id, fecha);

CREATE TABLE IF NOT EXISTS sesion_sets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id     UUID NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
  ejercicio_id  UUID NOT NULL REFERENCES ejercicios(id) ON DELETE RESTRICT,
  serie_num     INT NOT NULL,
  reps_hechas   INT,
  peso_hecho_kg NUMERIC(6,2),
  completada    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sesion_sets_sesion_idx ON sesion_sets(sesion_id);

CREATE TABLE IF NOT EXISTS asistencias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id  UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  presente   BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (atleta_id, fecha)
);
CREATE INDEX IF NOT EXISTS asistencias_atleta_fecha_idx ON asistencias(atleta_id, fecha);

CREATE TABLE IF NOT EXISTS objetivos_nutricion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id     UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  kcal          INT NOT NULL,
  proteina_g    INT NOT NULL,
  carbos_g      INT NOT NULL,
  grasas_g      INT NOT NULL,
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS objnutri_atleta_fecha_idx ON objetivos_nutricion(atleta_id, vigente_desde);

CREATE TABLE IF NOT EXISTS comidas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id   UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
  momento     momento_t NOT NULL,
  descripcion TEXT,
  kcal        INT NOT NULL DEFAULT 0,
  proteina_g  INT NOT NULL DEFAULT 0,
  carbos_g    INT NOT NULL DEFAULT 0,
  grasas_g    INT NOT NULL DEFAULT 0,
  foto_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comidas_atleta_fecha_idx ON comidas(atleta_id, fecha);

CREATE TABLE IF NOT EXISTS mensajes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id  UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  autor      autor_t NOT NULL,
  texto      TEXT NOT NULL,
  leido      BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensajes_atleta_fecha_idx ON mensajes(atleta_id, created_at);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id               UUID NOT NULL UNIQUE REFERENCES coaches(id) ON DELETE CASCADE,
  plan                   plan_t NOT NULL DEFAULT 'trial',
  status                 plan_status_t NOT NULL DEFAULT 'active',
  trial_ends_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  current_period_end     TIMESTAMPTZ,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_coach_idx ON subscriptions(coach_id);

CREATE TABLE IF NOT EXISTS fotos_progreso (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atleta_id  UUID NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
  foto_url   TEXT NOT NULL,
  nota       TEXT,
  fecha      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fotos_progreso_atleta_idx ON fotos_progreso(atleta_id, fecha);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE coaches             ENABLE ROW LEVEL SECURITY;
ALTER TABLE atletas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutinas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rutina_ejercicios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesion_sets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos_nutricion ENABLE ROW LEVEL SECURITY;
ALTER TABLE comidas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_progreso      ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_coach_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM coaches WHERE auth_user_id = auth.uid()
$$;

-- Políticas por tabla
CREATE POLICY coach_self        ON coaches       FOR ALL TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY atletas_own       ON atletas       FOR ALL TO authenticated USING (coach_id = current_coach_id()) WITH CHECK (coach_id = current_coach_id());
CREATE POLICY ejercicios_own    ON ejercicios    FOR ALL TO authenticated USING (coach_id = current_coach_id()) WITH CHECK (coach_id = current_coach_id());
CREATE POLICY rutinas_own       ON rutinas       FOR ALL TO authenticated USING (coach_id = current_coach_id()) WITH CHECK (coach_id = current_coach_id());
CREATE POLICY subs_select       ON subscriptions FOR SELECT TO authenticated USING (coach_id = current_coach_id());
CREATE POLICY fotos_prog_coach  ON fotos_progreso FOR SELECT TO authenticated USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY mediciones_own ON mediciones
  FOR ALL TO authenticated
  USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()))
  WITH CHECK (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY asignaciones_own ON asignaciones
  FOR ALL TO authenticated
  USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()))
  WITH CHECK (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY sesiones_own ON sesiones
  FOR ALL TO authenticated
  USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()))
  WITH CHECK (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY asistencias_own ON asistencias
  FOR ALL TO authenticated
  USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()))
  WITH CHECK (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY objnutri_own ON objetivos_nutricion
  FOR ALL TO authenticated
  USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()))
  WITH CHECK (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY comidas_own ON comidas
  FOR ALL TO authenticated
  USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()))
  WITH CHECK (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY mensajes_own ON mensajes
  FOR ALL TO authenticated
  USING (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()))
  WITH CHECK (atleta_id IN (SELECT id FROM atletas WHERE coach_id = current_coach_id()));

CREATE POLICY rutejer_own ON rutina_ejercicios
  FOR ALL TO authenticated
  USING (rutina_id IN (SELECT id FROM rutinas WHERE coach_id = current_coach_id()))
  WITH CHECK (rutina_id IN (SELECT id FROM rutinas WHERE coach_id = current_coach_id()));

CREATE POLICY sesionsets_own ON sesion_sets
  FOR ALL TO authenticated
  USING (sesion_id IN (SELECT s.id FROM sesiones s JOIN atletas a ON a.id = s.atleta_id WHERE a.coach_id = current_coach_id()))
  WITH CHECK (sesion_id IN (SELECT s.id FROM sesiones s JOIN atletas a ON a.id = s.atleta_id WHERE a.coach_id = current_coach_id()));

-- ============================================================
-- FUNCIONES (RPCs del portal del atleta)
-- ============================================================

CREATE OR REPLACE FUNCTION _atleta_por_token(p_token UUID)
RETURNS atletas LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM atletas WHERE token = p_token AND activo = true LIMIT 1
$$;

CREATE OR REPLACE FUNCTION portal_perfil_y_rutina(p_token UUID, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_dow INT; v_res JSONB;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  v_dow := EXTRACT(ISODOW FROM p_fecha);
  SELECT jsonb_build_object(
    'atleta', to_jsonb(v_at) - 'token',
    'rutina', (
      SELECT jsonb_build_object(
        'asignacion_id', asg.id, 'rutina_id', r.id, 'nombre', r.nombre,
        'ejercicios', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'rutina_ejercicio_id', re.id, 'ejercicio_id', e.id,
            'nombre', e.nombre, 'grupo_muscular', e.grupo_muscular,
            'gif_url', e.gif_url, 'orden', re.orden,
            'series', re.series, 'reps', re.reps,
            'peso_kg', re.peso_kg, 'descanso_seg', re.descanso_seg
          ) ORDER BY re.orden)
          FROM rutina_ejercicios re JOIN ejercicios e ON e.id = re.ejercicio_id
          WHERE re.rutina_id = r.id), '[]'::jsonb))
      FROM asignaciones asg JOIN rutinas r ON r.id = asg.rutina_id
      WHERE asg.atleta_id = v_at.id AND asg.dia_semana = v_dow AND asg.activa LIMIT 1),
    'asistio_hoy', EXISTS(SELECT 1 FROM asistencias WHERE atleta_id = v_at.id AND fecha = p_fecha)
  ) INTO v_res;
  RETURN v_res;
END $$;

CREATE OR REPLACE FUNCTION portal_registrar_set(
  p_token UUID, p_ejercicio_id UUID, p_serie_num INT,
  p_reps INT, p_peso NUMERIC, p_rutina_id UUID DEFAULT NULL,
  p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_ses UUID; v_set UUID;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  SELECT id INTO v_ses FROM sesiones WHERE atleta_id = v_at.id AND fecha = p_fecha LIMIT 1;
  IF v_ses IS NULL THEN
    INSERT INTO sesiones(atleta_id, rutina_id, fecha) VALUES (v_at.id, p_rutina_id, p_fecha) RETURNING id INTO v_ses;
  END IF;
  INSERT INTO sesion_sets(sesion_id, ejercicio_id, serie_num, reps_hechas, peso_hecho_kg, completada)
  VALUES (v_ses, p_ejercicio_id, p_serie_num, p_reps, p_peso, true) RETURNING id INTO v_set;
  RETURN v_set;
END $$;

CREATE OR REPLACE FUNCTION portal_marcar_asistencia(p_token UUID, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  INSERT INTO asistencias(atleta_id, fecha, presente) VALUES (v_at.id, p_fecha, true)
  ON CONFLICT (atleta_id, fecha) DO UPDATE SET presente = true;
END $$;

CREATE OR REPLACE FUNCTION portal_nutricion(p_token UUID, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_res JSONB;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  SELECT jsonb_build_object(
    'objetivo', (SELECT to_jsonb(o) FROM objetivos_nutricion o
                 WHERE o.atleta_id = v_at.id AND o.vigente_desde <= p_fecha
                 ORDER BY o.vigente_desde DESC LIMIT 1),
    'comidas', COALESCE((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.created_at)
                 FROM comidas c WHERE c.atleta_id = v_at.id AND c.fecha = p_fecha), '[]'::jsonb),
    'consumido', (SELECT jsonb_build_object(
      'kcal', COALESCE(SUM(kcal),0), 'proteina_g', COALESCE(SUM(proteina_g),0),
      'carbos_g', COALESCE(SUM(carbos_g),0), 'grasas_g', COALESCE(SUM(grasas_g),0))
      FROM comidas WHERE atleta_id = v_at.id AND fecha = p_fecha)
  ) INTO v_res;
  RETURN v_res;
END $$;

CREATE OR REPLACE FUNCTION portal_registrar_comida(
  p_token UUID, p_momento momento_t, p_descripcion TEXT,
  p_kcal INT, p_prot INT, p_carb INT, p_gra INT,
  p_foto_url TEXT DEFAULT NULL, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_id UUID;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  INSERT INTO comidas(atleta_id, fecha, momento, descripcion, kcal, proteina_g, carbos_g, grasas_g, foto_url)
  VALUES (v_at.id, p_fecha, p_momento, p_descripcion, p_kcal, p_prot, p_carb, p_gra, p_foto_url) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION portal_progreso(p_token UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.fecha)
                   FROM mediciones m WHERE m.atleta_id = v_at.id), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION portal_leer_mensajes(p_token UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_res JSONB;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  UPDATE mensajes SET leido = true WHERE atleta_id = v_at.id AND autor = 'coach' AND NOT leido;
  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.created_at), '[]'::jsonb)
  INTO v_res FROM mensajes m WHERE m.atleta_id = v_at.id;
  RETURN v_res;
END $$;

CREATE OR REPLACE FUNCTION portal_enviar_mensaje(p_token UUID, p_texto TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_id UUID;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  INSERT INTO mensajes(atleta_id, autor, texto) VALUES (v_at.id, 'atleta', p_texto) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION portal_sesion_hoy(p_token UUID, p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'ejercicio_id', ss.ejercicio_id, 'serie_num', ss.serie_num,
      'reps_hechas', ss.reps_hechas, 'peso_hecho_kg', ss.peso_hecho_kg,
      'completada', ss.completada))
    FROM sesiones s JOIN sesion_sets ss ON ss.sesion_id = s.id
    WHERE s.atleta_id = v_at.id AND s.fecha = p_fecha), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION portal_historial(p_token UUID, p_dias INT DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_res JSONB;
BEGIN
  v_at := _atleta_por_token(p_token);
  IF v_at.id IS NULL THEN RAISE EXCEPTION 'token invalido'; END IF;
  SELECT COALESCE(jsonb_agg(row ORDER BY row->>'fecha'), '[]'::jsonb) INTO v_res
  FROM (
    SELECT jsonb_build_object(
      'fecha', (g.d::DATE)::TEXT,
      'asistio',
        EXISTS(SELECT 1 FROM asistencias a WHERE a.atleta_id = v_at.id AND a.fecha = g.d::DATE)
        OR EXISTS(SELECT 1 FROM sesiones s WHERE s.atleta_id = v_at.id AND s.fecha = g.d::DATE),
      'sets_planeados', COALESCE((
        SELECT SUM(re.series) FROM asignaciones asg
        JOIN rutina_ejercicios re ON re.rutina_id = asg.rutina_id
        WHERE asg.atleta_id = v_at.id AND asg.activa
          AND asg.dia_semana = EXTRACT(ISODOW FROM g.d)::INT), 0),
      'sets_hechos', COALESCE((
        SELECT COUNT(*) FROM sesiones s JOIN sesion_sets ss ON ss.sesion_id = s.id
        WHERE s.atleta_id = v_at.id AND s.fecha = g.d::DATE AND ss.completada), 0),
      'kcal_meta', (SELECT o.kcal FROM objetivos_nutricion o
                    WHERE o.atleta_id = v_at.id AND o.vigente_desde <= g.d::DATE
                    ORDER BY o.vigente_desde DESC LIMIT 1),
      'prot_meta', (SELECT o.proteina_g FROM objetivos_nutricion o
                    WHERE o.atleta_id = v_at.id AND o.vigente_desde <= g.d::DATE
                    ORDER BY o.vigente_desde DESC LIMIT 1),
      'kcal_cons', COALESCE((SELECT SUM(kcal) FROM comidas c WHERE c.atleta_id = v_at.id AND c.fecha = g.d::DATE), 0),
      'prot_cons', COALESCE((SELECT SUM(proteina_g) FROM comidas c WHERE c.atleta_id = v_at.id AND c.fecha = g.d::DATE), 0)
    ) AS row
    FROM generate_series(CURRENT_DATE - (p_dias - 1), CURRENT_DATE, INTERVAL '1 day') AS g(d)
  ) sub;
  RETURN v_res;
END $$;

CREATE OR REPLACE FUNCTION portal_branding(p_token UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_at atletas; v_coach coaches;
BEGIN
  SELECT * INTO v_at FROM atletas WHERE token = p_token AND activo = true LIMIT 1;
  IF v_at.id IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT * INTO v_coach FROM coaches WHERE id = v_at.coach_id LIMIT 1;
  RETURN jsonb_build_object(
    'logo_url',      v_coach.logo_url,
    'brand_primary', v_coach.brand_primary,
    'brand_accent',  v_coach.brand_accent
  );
END $$;

CREATE OR REPLACE FUNCTION portal_agregar_foto_progreso(
  p_token UUID, p_foto_url TEXT, p_nota TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_atleta_id UUID;
BEGIN
  SELECT id INTO v_atleta_id FROM atletas WHERE token = p_token AND activo = TRUE;
  IF v_atleta_id IS NULL THEN RAISE EXCEPTION 'token inválido'; END IF;
  INSERT INTO fotos_progreso(atleta_id, foto_url, nota, fecha) VALUES (v_atleta_id, p_foto_url, p_nota, CURRENT_DATE);
END $$;

CREATE OR REPLACE FUNCTION portal_fotos_progreso(p_token UUID)
RETURNS TABLE(id UUID, foto_url TEXT, nota TEXT, fecha DATE) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_atleta_id UUID;
BEGIN
  SELECT a.id INTO v_atleta_id FROM atletas a WHERE a.token = p_token AND a.activo = TRUE;
  IF v_atleta_id IS NULL THEN RAISE EXCEPTION 'token inválido'; END IF;
  RETURN QUERY SELECT fp.id, fp.foto_url, fp.nota, fp.fecha
    FROM fotos_progreso fp WHERE fp.atleta_id = v_atleta_id
    ORDER BY fp.fecha DESC, fp.created_at DESC;
END $$;

-- Trigger: inicializa trial al crear coach
CREATE OR REPLACE FUNCTION init_coach_subscription()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO subscriptions(coach_id) VALUES (new.id) ON CONFLICT (coach_id) DO NOTHING;
  RETURN new;
END $$;

DROP TRIGGER IF EXISTS after_coach_insert ON coaches;
CREATE TRIGGER after_coach_insert
  AFTER INSERT ON coaches FOR EACH ROW EXECUTE FUNCTION init_coach_subscription();

-- Permisos de ejecución para el rol anon (portal del atleta)
GRANT EXECUTE ON FUNCTION
  portal_perfil_y_rutina(UUID, DATE),
  portal_registrar_set(UUID, UUID, INT, INT, NUMERIC, UUID, DATE),
  portal_marcar_asistencia(UUID, DATE),
  portal_nutricion(UUID, DATE),
  portal_registrar_comida(UUID, momento_t, TEXT, INT, INT, INT, INT, TEXT, DATE),
  portal_progreso(UUID),
  portal_leer_mensajes(UUID),
  portal_enviar_mensaje(UUID, TEXT),
  portal_sesion_hoy(UUID, DATE),
  portal_historial(UUID, INT),
  portal_branding(UUID),
  portal_agregar_foto_progreso(UUID, TEXT, TEXT),
  portal_fotos_progreso(UUID)
TO anon;

-- ============================================================
-- STORAGE — Buckets y políticas
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('coach-logos', 'coach-logos', true) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='fotos_insert') THEN
    CREATE POLICY fotos_insert ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'fotos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='fotos_select') THEN
    CREATE POLICY fotos_select ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'fotos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='coach_logos_select') THEN
    CREATE POLICY coach_logos_select ON storage.objects FOR SELECT USING (bucket_id = 'coach-logos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='coach_logos_insert') THEN
    CREATE POLICY coach_logos_insert ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'coach-logos' AND (storage.foldername(name))[1] = (SELECT id::text FROM coaches WHERE auth_user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='coach_logos_delete') THEN
    CREATE POLICY coach_logos_delete ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'coach-logos' AND (storage.foldername(name))[1] = (SELECT id::text FROM coaches WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

-- ============================================================
-- DATOS DEMO
-- ============================================================
-- Requiere que el usuario coach@coachpro.test ya exista en Authentication.

DO $$
DECLARE
  v_email  TEXT := 'coach@coachpro.test';
  v_uid    UUID;
  v_coach  UUID;
  a_ana    UUID := '44444444-4444-4444-4444-444444444444';
  a_luis   UUID := '55555555-5555-5555-5555-555555555555';
  a_marta  UUID := '66666666-6666-6666-6666-666666666666';
  e_sent   UUID; e_press UUID; e_jalon UUID; e_curl UUID;
  e_remo   UUID; e_peso  UUID; e_zanc  UUID; e_plancha UUID;
  r_full   UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = v_email;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No existe el usuario % en Authentication. Créalo primero en el Dashboard.', v_email;
  END IF;

  INSERT INTO coaches(email, nombre, auth_user_id)
  VALUES (v_email, 'Entrenador Demo', v_uid)
  ON CONFLICT (auth_user_id) DO UPDATE SET email = EXCLUDED.email
  RETURNING id INTO v_coach;

  INSERT INTO atletas(id, coach_id, nombre, telefono, objetivo, fecha_inicio, token, notas) VALUES
    (a_ana,   v_coach, 'Ana Reyes',  '+52 55 1111 1111', 'perdida_grasa', CURRENT_DATE - 40, '11111111-1111-1111-1111-111111111111', 'Constante, viaja los viernes.'),
    (a_luis,  v_coach, 'Luis Mora',  '+52 55 2222 2222', 'hipertrofia',   CURRENT_DATE - 90, '22222222-2222-2222-2222-222222222222', 'Quiere subir banca.'),
    (a_marta, v_coach, 'Marta Díaz', '+52 55 3333 3333', 'recomposicion', CURRENT_DATE - 15, '33333333-3333-3333-3333-333333333333', 'Empezó hace poco.')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Sentadilla',     'Piernas')  RETURNING id INTO e_sent;
  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Press banca',    'Pecho')    RETURNING id INTO e_press;
  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Jalón al pecho', 'Espalda')  RETURNING id INTO e_jalon;
  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Curl bíceps',    'Brazos')   RETURNING id INTO e_curl;
  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Remo con barra', 'Espalda')  RETURNING id INTO e_remo;
  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Peso muerto',    'Piernas')  RETURNING id INTO e_peso;
  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Zancadas',       'Piernas')  RETURNING id INTO e_zanc;
  INSERT INTO ejercicios(coach_id, nombre, grupo_muscular) VALUES (v_coach, 'Plancha',        'Core')     RETURNING id INTO e_plancha;

  INSERT INTO rutinas(coach_id, nombre, descripcion)
  VALUES (v_coach, 'Full Body A', 'Rutina de cuerpo completo, 3x semana.') RETURNING id INTO r_full;

  INSERT INTO rutina_ejercicios(rutina_id, ejercicio_id, orden, series, reps, peso_kg, descanso_seg) VALUES
    (r_full, e_sent,    1, 4, 8,  60, 120),
    (r_full, e_press,   2, 4, 8,  40, 120),
    (r_full, e_remo,    3, 3, 10, 35, 90),
    (r_full, e_jalon,   4, 3, 12, 45, 90),
    (r_full, e_curl,    5, 3, 12, 12, 60),
    (r_full, e_plancha, 6, 3, 1,  null, 60);

  INSERT INTO asignaciones(atleta_id, rutina_id, dia_semana, activa)
  SELECT a.id, r_full, d.dia, true
  FROM (VALUES (a_ana),(a_luis),(a_marta)) AS a(id)
  CROSS JOIN (VALUES (1),(3),(5)) AS d(dia);

  INSERT INTO objetivos_nutricion(atleta_id, kcal, proteina_g, carbos_g, grasas_g) VALUES
    (a_ana,  1700, 130, 150, 55),
    (a_luis, 2600, 180, 280, 75),
    (a_marta,2000, 150, 180, 65);

  INSERT INTO mediciones(atleta_id, fecha, peso_kg, grasa_pct, cintura_cm) VALUES
    (a_ana,  CURRENT_DATE - 40, 72.0, 31.0, 86),
    (a_ana,  CURRENT_DATE - 26, 70.8, 30.1, 84),
    (a_ana,  CURRENT_DATE - 12, 69.6, 29.0, 82),
    (a_ana,  CURRENT_DATE - 2,  68.9, 28.4, 81),
    (a_luis, CURRENT_DATE - 60, 78.0, 18.0, 84),
    (a_luis, CURRENT_DATE - 30, 79.5, 17.5, 84),
    (a_luis, CURRENT_DATE - 5,  81.0, 17.0, 85),
    (a_marta,CURRENT_DATE - 12, 64.0, 27.0, 78),
    (a_marta,CURRENT_DATE - 2,  63.6, 26.6, 77);

  INSERT INTO asistencias(atleta_id, fecha, presente) VALUES
    (a_ana,  CURRENT_DATE,     true),
    (a_ana,  CURRENT_DATE - 2, true),
    (a_ana,  CURRENT_DATE - 4, true),
    (a_luis, CURRENT_DATE - 1, true),
    (a_luis, CURRENT_DATE - 3, true)
  ON CONFLICT (atleta_id, fecha) DO NOTHING;

  INSERT INTO comidas(atleta_id, fecha, momento, descripcion, kcal, proteina_g, carbos_g, grasas_g) VALUES
    (a_ana, CURRENT_DATE, 'desayuno', 'Avena con claras y fruta', 380, 30, 45, 8),
    (a_ana, CURRENT_DATE, 'comida',   'Pollo, arroz y ensalada',  620, 48, 60, 18);

  INSERT INTO mensajes(atleta_id, autor, texto, leido) VALUES
    (a_ana,   'coach',  '¡Bien la semana! Sube 2.5kg en sentadilla.', true),
    (a_ana,   'atleta', 'Listo, hoy lo pruebo 💪', false),
    (a_marta, 'coach',  'Te espero esta semana, no aflojes.', false);

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Setup completado. Coach: %', v_email;
  RAISE NOTICE 'Tokens del portal:';
  RAISE NOTICE '  Ana:   /?token=11111111-1111-1111-1111-111111111111';
  RAISE NOTICE '  Luis:  /?token=22222222-2222-2222-2222-222222222222';
  RAISE NOTICE '  Marta: /?token=33333333-3333-3333-3333-333333333333';
  RAISE NOTICE '==========================================';
END $$;
