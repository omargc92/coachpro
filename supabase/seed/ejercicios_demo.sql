-- ============================================================
-- Seed: catálogo de ejercicios del coach demo (coach@coachpro.app)
-- ------------------------------------------------------------
-- 74 ejercicios exportados desde la BD de producción (proyecto coachpro).
-- Idempotente: inserta cada ejercicio SOLO si el coach demo aún no lo
-- tiene registrado (comparando por nombre). Conserva los UUID originales
-- para no romper referencias de rutina_ejercicios cuando se restaura.
--
-- Uso:
--   psql "$DB_URL" -f supabase/seed/ejercicios_demo.sql
--   — o pegarlo en el SQL editor de Supabase.
-- ============================================================

do $$
declare
  v_coach uuid;
  v_before int;
  v_after int;
begin
  select id into v_coach from public.coaches where email = 'coach@coachpro.app';
  if v_coach is null then
    raise exception 'No existe el coach demo (coach@coachpro.app); corre las migraciones / crea el coach primero.';
  end if;

  select count(*) into v_before from public.ejercicios where coach_id = v_coach;

  insert into public.ejercicios (id, coach_id, nombre, grupo_muscular, gif_url)
  select v.id, v_coach, v.nombre, v.grupo_muscular, v.gif_url
  from (values
    -- Brazos
    ('bd1eea68-10e3-47a3-8b28-397997c1b592'::uuid, '(Curl) Martillos alternados con mancuernas', 'Brazos', null::text),
    ('f8e03ab5-5b16-4f65-95c6-fed711736ee6'::uuid, 'Banco predicador barra z', 'Brazos', null::text),
    ('8062d86f-2a11-4e35-a293-986be56acee0'::uuid, 'Copa a dos manos para triceps', 'Brazos', null::text),
    ('15ee363b-c220-403b-9f40-398a70c33597'::uuid, 'Culr de biceps con barra Z desde polea baja', 'Brazos', null::text),
    ('f1b460ea-2383-462f-8c6c-b1ce0755d1d5'::uuid, 'Curl biceps con barra z', 'Brazos', null::text),
    ('dd2644a2-f9c9-4ab1-b172-95a1288cb235'::uuid, 'Curl bíceps con mancuernas alternado', 'Brazos', null::text),
    ('b8d7b21a-f3e0-4ccb-9498-6d5cdbfa9f72'::uuid, 'Curl de biceps barra recta desde polea baja', 'Brazos', null::text),
    ('f3cde8e4-e337-4adb-8d7b-cd5e0e8a017b'::uuid, 'Curl de biceps con maquina', 'Brazos', null::text),
    ('f0c3960a-df27-43e8-a750-bd7d33ad231b'::uuid, 'Curl spider con barra', 'Brazos', null::text),
    ('9e9d4b37-6ee0-4d02-924e-dc3569934f55'::uuid, 'Extensión de triceps en polea con barra recta', 'Brazos', null::text),
    ('a611e827-2fcd-4744-8795-ea3a876e2b19'::uuid, 'Extensión de triceps en polea con cuerda', 'Brazos', null::text),
    ('89ada675-48bc-40b0-8d4d-bfd3f5109b55'::uuid, 'Extensión tríceps en polea con barra z', 'Brazos', null::text),
    ('5c22d5aa-80a5-4aeb-8be9-d59bd1517840'::uuid, 'Fondos cortos para triceps', 'Brazos', null::text),
    ('05819a8c-ccb8-48da-a373-5fab138d7848'::uuid, 'Jalon tras nuca con cuerda para triceps', 'Brazos', null::text),
    ('9991af5b-2680-4c74-b6b0-5e1698f6771b'::uuid, 'Rompe craneos', 'Brazos', null::text),
    -- Espalda
    ('3a100127-8c54-42c8-83ef-0cc8d490586c'::uuid, 'Dominadas AG', 'Espalda', null::text),
    ('d5e1f7c1-fe9b-4d99-8eb4-a639910724f4'::uuid, 'Dominadas asistidas', 'Espalda', null::text),
    ('c2aee9ab-b459-4dd9-80ad-528756548197'::uuid, 'Jalon al pecho en polea agarre neutro', 'Espalda', null::text),
    ('98af611b-eb81-4ca8-b9dd-ebe71de8f3b6'::uuid, 'Jalón al pecho en polea agarre abierto', 'Espalda', null::text),
    ('b0f22334-d86c-4a3e-a36a-1502a2d100b2'::uuid, 'Pullover en polea brazos rectos', 'Espalda', null::text),
    ('c050103d-e549-4208-97ce-3f6a12c28f29'::uuid, 'Remo con barra agarre pronado', 'Espalda', null::text),
    ('fe5a5f3d-3f7c-45ca-bcb1-551ddce63cb5'::uuid, 'Remo con mancuerna a una mano', 'Espalda', null::text),
    ('40bcf213-20c9-4749-838f-b858ffff0cfa'::uuid, 'Remo en maquina', 'Espalda', null::text),
    ('5bb089cc-a1fe-4e13-a30e-0832eeed6a95'::uuid, 'Remo en maquina con pecho apoyado / Barra T', 'Espalda', null::text),
    ('a0263c95-bf84-4304-a728-de2353a5e9ca'::uuid, 'Remo sentado en polea agarre neutro', 'Espalda', null::text),
    -- Hombros
    ('36b85387-3dee-4ce6-b24d-82b9aa30f531'::uuid, 'aperturas invertidas para hombro posterior en maquina', 'Hombros', null::text),
    ('2c9141d3-28ca-4a9c-acce-2ad0d90b9554'::uuid, 'Frontales alternados con mancuernas', 'Hombros', null::text),
    ('2bce057d-cc92-4b81-b5b9-725c9ce103a9'::uuid, 'Frontales con mancuernas', 'Hombros', null::text),
    ('dcb0b639-49b5-4849-acc3-77ef5e2abc97'::uuid, 'Frontales disco', 'Hombros', null::text),
    ('5a5cd885-bb99-4d92-a34b-b0ee5ad97274'::uuid, 'Laterales con mancuerna', 'Hombros', null::text),
    ('827e6630-13fa-4620-a3b3-d379909d16a2'::uuid, 'Laterales en maquina brazo extendido', 'Hombros', null::text),
    ('45d73af9-7e1e-47d1-89ca-e8cc6ad2dc52'::uuid, 'Press de hombros con barra', 'Hombros', null::text),
    ('9de9fd98-ea40-4fa2-8b33-b8d784807e36'::uuid, 'Press militar con mancuernas', 'Hombros', null::text),
    ('b0966645-9802-4c92-b64d-29b651cd88ea'::uuid, 'Press militar en maquina', 'Hombros', null::text),
    -- Pecho
    ('a3e7b489-8b2d-433a-88f2-f4a0b80f06e7'::uuid, 'Aperturas en maquina', 'Pecho', null::text),
    ('2bca6682-8ac7-4025-8061-e26fae80f5b0'::uuid, 'Aperturas en maquina inclinada', 'Pecho', null::text),
    ('d723582c-0a0e-4796-a71c-ed565edce674'::uuid, 'Aperturas en poleas altas/crossover', 'Pecho', null::text),
    ('f88bac72-dd63-4a6a-bcc9-0d653082c6c5'::uuid, 'Aperturas en poleas/crossover', 'Pecho', null::text),
    ('eeaf6d13-66bb-4258-8112-5e917c209673'::uuid, 'Bench press/ press banco plano con barra', 'Pecho', null::text),
    ('578cccf3-27c3-45f6-8f82-3214623cd983'::uuid, 'Cruce de poleas bajas/ crossover en polea baja', 'Pecho', null::text),
    ('d4dccf0f-5a6d-49ff-a3fe-9d60ea10756b'::uuid, 'Curl spider con mancuernas', 'Pecho', null::text),
    ('7a3a391d-025d-4f46-b1e9-eb1e668c81c6'::uuid, 'Dominads', 'Pecho', null::text),
    ('61457e7b-7ee7-49a2-a43c-793576ad9c48'::uuid, 'Flexiones/lagartijas', 'Pecho', null::text),
    ('3e70993e-e22a-4cc0-8df4-0b9079415b2b'::uuid, 'Fondos profundos enfocados en pecho', 'Pecho', null::text),
    ('f5d4f2ca-1e05-430a-823a-313c7b1d6506'::uuid, 'Jalon trasnuca con cuerda desde polea baja', 'Pecho', null::text),
    ('18f5cf87-07a9-48ff-89e9-53376e2a120f'::uuid, 'Press inclinado con barra', 'Pecho', null::text),
    ('4fe2954c-125a-455f-bc87-c84cb458dd7e'::uuid, 'Press inclinado con mancuernas', 'Pecho', null::text),
    ('62469eaf-06df-4b9e-989d-18977ff4d829'::uuid, 'Press inclinado en maquina', 'Pecho', null::text),
    ('41dd2d05-0ace-45b8-b243-b153f2483433'::uuid, 'Press plano con mancuernas', 'Pecho', null::text),
    ('92723a55-4f98-4a64-9607-48b3f66efcd4'::uuid, 'Press plano en maquina', 'Pecho', null::text),
    -- Piernas
    ('3c1691f8-7049-491a-a729-7f87a8942382'::uuid, 'Abduccion de cadera en maquina/Abductores', 'Piernas', null::text),
    ('3acf5a11-0dfb-4b65-ba2b-6ca0c88d741f'::uuid, 'Aduccíón de cadera en maquina/aducciones', 'Piernas', null::text),
    ('5190b53a-082f-4f80-9f85-d48d17f5c017'::uuid, 'Curl Femoral acostado en maquina', 'Piernas', null::text),
    ('5451531e-1485-48a2-b5c1-1399dd7d99a8'::uuid, 'Curl Femoral sentado en maquina', 'Piernas', null::text),
    ('0cd957f4-3bc2-4e8c-9916-61e3309d4fc5'::uuid, 'Desplantes / zancadas', 'Piernas', null::text),
    ('3b9c9bcf-04bf-4cee-bdcf-fe51793af76c'::uuid, 'Elevacion de talones con rodilla extendida', 'Piernas', null::text),
    ('80093d0e-9d52-4007-995f-952e11d8d61b'::uuid, 'Extensión de cadera en maquina', 'Piernas', null::text),
    ('d7c33daf-8b53-4291-a3d5-13b2e547fd03'::uuid, 'Hip Thrust con barra', 'Piernas', null::text),
    ('3c2da722-49fd-4ccf-a4f1-649bcdc45c74'::uuid, 'Hip thrust en maquina', 'Piernas', null::text),
    ('94435c80-b953-441c-a0a2-6360eee08ad0'::uuid, 'Leg extension/ extensión de cuádriceps', 'Piernas', null::text),
    ('d5a624a1-f175-434e-998f-43e22f49204d'::uuid, 'Patada polea baja', 'Piernas', null::text),
    ('d2cfde83-7964-45a3-9264-a0ade5be1a95'::uuid, 'Peso muerto a una pierna', 'Piernas', null::text),
    ('80f5037a-aa0e-4caf-8251-92f71b0b554d'::uuid, 'Peso muerto con barra', 'Piernas', null::text),
    ('ecccc92d-a2d2-4412-a0dc-4f690f50449d'::uuid, 'Peso muerto con mancuernas', 'Piernas', null::text),
    ('a7ae39c8-5309-4f65-b3d1-4b2052277344'::uuid, 'Sentadilla búlgara', 'Piernas', null::text),
    ('58180ea0-08b4-4701-aeca-958018ee25e4'::uuid, 'Sentadilla frontal', 'Piernas', null::text),
    ('0af09698-26cd-4728-ab76-096b09e1c65d'::uuid, 'Sentadilla Goblet', 'Piernas', null::text),
    ('95fec4fb-09dd-4c00-8f2f-174965ea7709'::uuid, 'Sentadilla Hack', 'Piernas', null::text),
    ('467ddfa5-b9ab-4bd3-94bc-41a29271680f'::uuid, 'Sentadilla libre', 'Piernas', null::text),
    ('1f455692-a07a-4711-bb51-ea842f8a0701'::uuid, 'Sentadilla profunda', 'Piernas', null::text),
    ('7aad0eb2-fcbf-4cb5-9ab4-5ab52f7df110'::uuid, 'Sentadilla smith', 'Piernas', null::text),
    ('58994130-d96c-44f5-84e8-23e3e3ead8f4'::uuid, 'Sentadilla sumo', 'Piernas', null::text),
    ('aa68a317-02db-409d-8dc7-4a5585a9ff76'::uuid, 'Step up en banco', 'Piernas', null::text),
    ('2605d85d-93f4-447d-81eb-f3a0aaa150f2'::uuid, 'Zancadas/desplantes caminando', 'Piernas', null::text)
  ) as v(id, nombre, grupo_muscular, gif_url)
  where not exists (
    select 1 from public.ejercicios e
    where e.coach_id = v_coach and e.nombre = v.nombre
  )
  on conflict (id) do nothing;

  select count(*) into v_after from public.ejercicios where coach_id = v_coach;
  raise notice 'ejercicios demo: % -> % (insertados %)', v_before, v_after, v_after - v_before;
end $$;
