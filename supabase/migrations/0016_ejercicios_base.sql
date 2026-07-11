-- ============================================================
-- Catálogo base de ejercicios — plantilla global para cuentas nuevas
-- ------------------------------------------------------------
-- Toda cuenta de coach que se cree recibe automáticamente una copia
-- editable de estos 74 ejercicios (trigger after insert on coaches),
-- igual que init_coach_subscription() inicializa el trial (migración 0004).
-- El modelo per-coach y las RLS no cambian: cada coach edita SU copia.
-- ============================================================

-- ---------- Tabla plantilla ----------
create table if not exists ejercicios_base (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null unique,
  grupo_muscular text not null,
  gif_url        text,
  created_at     timestamptz not null default now()
);

-- Solo el service role / funciones definer la tocan; sin acceso directo de clientes.
alter table ejercicios_base enable row level security;

-- ---------- Semilla del catálogo base (74 ejercicios) ----------
insert into ejercicios_base (nombre, grupo_muscular, gif_url)
values
  -- Brazos
  ('(Curl) Martillos alternados con mancuernas', 'Brazos', null),
  ('Banco predicador barra z', 'Brazos', null),
  ('Copa a dos manos para triceps', 'Brazos', null),
  ('Culr de biceps con barra Z desde polea baja', 'Brazos', null),
  ('Curl biceps con barra z', 'Brazos', null),
  ('Curl bíceps con mancuernas alternado', 'Brazos', null),
  ('Curl de biceps barra recta desde polea baja', 'Brazos', null),
  ('Curl de biceps con maquina', 'Brazos', null),
  ('Curl spider con barra', 'Brazos', null),
  ('Extensión de triceps en polea con barra recta', 'Brazos', null),
  ('Extensión de triceps en polea con cuerda', 'Brazos', null),
  ('Extensión tríceps en polea con barra z', 'Brazos', null),
  ('Fondos cortos para triceps', 'Brazos', null),
  ('Jalon tras nuca con cuerda para triceps', 'Brazos', null),
  ('Rompe craneos', 'Brazos', null),
  -- Espalda
  ('Dominadas AG', 'Espalda', null),
  ('Dominadas asistidas', 'Espalda', null),
  ('Jalon al pecho en polea agarre neutro', 'Espalda', null),
  ('Jalón al pecho en polea agarre abierto', 'Espalda', null),
  ('Pullover en polea brazos rectos', 'Espalda', null),
  ('Remo con barra agarre pronado', 'Espalda', null),
  ('Remo con mancuerna a una mano', 'Espalda', null),
  ('Remo en maquina', 'Espalda', null),
  ('Remo en maquina con pecho apoyado / Barra T', 'Espalda', null),
  ('Remo sentado en polea agarre neutro', 'Espalda', null),
  -- Hombros
  ('aperturas invertidas para hombro posterior en maquina', 'Hombros', null),
  ('Frontales alternados con mancuernas', 'Hombros', null),
  ('Frontales con mancuernas', 'Hombros', null),
  ('Frontales disco', 'Hombros', null),
  ('Laterales con mancuerna', 'Hombros', null),
  ('Laterales en maquina brazo extendido', 'Hombros', null),
  ('Press de hombros con barra', 'Hombros', null),
  ('Press militar con mancuernas', 'Hombros', null),
  ('Press militar en maquina', 'Hombros', null),
  -- Pecho
  ('Aperturas en maquina', 'Pecho', null),
  ('Aperturas en maquina inclinada', 'Pecho', null),
  ('Aperturas en poleas altas/crossover', 'Pecho', null),
  ('Aperturas en poleas/crossover', 'Pecho', null),
  ('Bench press/ press banco plano con barra', 'Pecho', null),
  ('Cruce de poleas bajas/ crossover en polea baja', 'Pecho', null),
  ('Curl spider con mancuernas', 'Pecho', null),
  ('Dominads', 'Pecho', null),
  ('Flexiones/lagartijas', 'Pecho', null),
  ('Fondos profundos enfocados en pecho', 'Pecho', null),
  ('Jalon trasnuca con cuerda desde polea baja', 'Pecho', null),
  ('Press inclinado con barra', 'Pecho', null),
  ('Press inclinado con mancuernas', 'Pecho', null),
  ('Press inclinado en maquina', 'Pecho', null),
  ('Press plano con mancuernas', 'Pecho', null),
  ('Press plano en maquina', 'Pecho', null),
  -- Piernas
  ('Abduccion de cadera en maquina/Abductores', 'Piernas', null),
  ('Aduccíón de cadera en maquina/aducciones', 'Piernas', null),
  ('Curl Femoral acostado en maquina', 'Piernas', null),
  ('Curl Femoral sentado en maquina', 'Piernas', null),
  ('Desplantes / zancadas', 'Piernas', null),
  ('Elevacion de talones con rodilla extendida', 'Piernas', null),
  ('Extensión de cadera en maquina', 'Piernas', null),
  ('Hip Thrust con barra', 'Piernas', null),
  ('Hip thrust en maquina', 'Piernas', null),
  ('Leg extension/ extensión de cuádriceps', 'Piernas', null),
  ('Patada polea baja', 'Piernas', null),
  ('Peso muerto a una pierna', 'Piernas', null),
  ('Peso muerto con barra', 'Piernas', null),
  ('Peso muerto con mancuernas', 'Piernas', null),
  ('Sentadilla búlgara', 'Piernas', null),
  ('Sentadilla frontal', 'Piernas', null),
  ('Sentadilla Goblet', 'Piernas', null),
  ('Sentadilla Hack', 'Piernas', null),
  ('Sentadilla libre', 'Piernas', null),
  ('Sentadilla profunda', 'Piernas', null),
  ('Sentadilla smith', 'Piernas', null),
  ('Sentadilla sumo', 'Piernas', null),
  ('Step up en banco', 'Piernas', null),
  ('Zancadas/desplantes caminando', 'Piernas', null)
on conflict (nombre) do nothing;

-- ---------- Función + trigger: copia la plantilla a cada coach nuevo ----------
create or replace function seed_coach_base_catalog()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into ejercicios (coach_id, nombre, grupo_muscular, gif_url)
  select new.id, b.nombre, b.grupo_muscular, b.gif_url
  from ejercicios_base b
  where not exists (
    select 1 from ejercicios e
    where e.coach_id = new.id and e.nombre = b.nombre
  );
  return new;
end $$;

drop trigger if exists after_coach_insert_catalog on coaches;
create trigger after_coach_insert_catalog
  after insert on coaches
  for each row execute function seed_coach_base_catalog();
