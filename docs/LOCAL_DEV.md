# Desarrollo local — CoachPro

## Por qué PostgreSQL solo no es suficiente

La app usa `supabase-js`, que habla con la **API HTTP de Supabase** (PostgREST + Auth + Storage).
No puede conectarse directamente a PostgreSQL: necesita esa capa de API encima.

Tu PostgreSQL local sirve para:
- Explorar el esquema con `psql`
- Entender el modelo de datos
- Ser la BD cuando uses Supabase CLI + Docker

Para **correr la app** necesitas una de las dos opciones:

---

## Opción A — Proyecto Supabase gratuito (recomendada, ~5 min)

La más rápida. No requiere Docker ni configuración extra.

1. Crea cuenta en [supabase.com](https://supabase.com) → **New project** (gratis, sin tarjeta).
2. Espera que inicie (~2 min).
3. Ve a **Project Settings → API** → copia:
   - `Project URL`
   - `anon public` key
4. En **SQL Editor**, ejecuta las migraciones **en orden**:
   `supabase/migrations/0001…0007`. (El bundle
   [`supabase/migrations/EJECUTAR_EN_SUPABASE.sql`](../supabase/migrations/EJECUTAR_EN_SUPABASE.sql)
   agrupa las fases A/B/D + paywall; léelo antes de correrlo.)
5. Ve a **Authentication → Users → Add user** y crea **tu propio** usuario coach
   con un email y password tuyos. Marca "Auto Confirm User". Luego regístralo en la
   tabla `coaches` (o entra a la app por primera vez para autoprovisionarte).
6. Crea el archivo `.env.local` con tus credenciales (ya existe la plantilla).
7. Corre la app:
   ```bash
   npm run dev
   ```
8. Abre `http://localhost:5173` → login con **tus** credenciales.

> El catálogo es autogestionado: no hay seed demo. Da de alta tus propios atletas
> desde el portal del coach; el link con `?token=…` de cada atleta aparece en su
> pantalla de detalle.

---

## Opción B — Supabase CLI + Docker (100% local)

Requiere Docker instalado. Da una experiencia 100% offline.

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar en el proyecto
supabase init

# Levantar el stack local (requiere Docker)
supabase start
```

`supabase start` imprime la URL local y la anon key. Ponlas en `.env.local`.

Después corre las migraciones:
```bash
supabase db push
```

O manualmente en el SQL Editor local (corre en `http://localhost:54323`).

---

## Explorar la BD con psql (sin correr la app)

```bash
# Crear la BD y cargar el esquema completo
bash scripts/setup-local-db.sh

# Conectar
psql -U postgres -d coachpro_local

# Ejemplos de consultas
SELECT nombre, token FROM atletas;
SELECT * FROM coaches;
SELECT * FROM subscriptions;
SELECT * FROM mediciones ORDER BY fecha;
```

---

## Seguridad de credenciales

| Archivo | En git | Uso |
|---|---|---|
| `.env` | NO (gitignored) | Credenciales de producción (del compañero) |
| `.env.local` | NO (gitignored) | Tus credenciales de test |
| `.env.example` | SÍ | Plantilla pública sin valores |

Vite carga en este orden: `.env.local` → `.env`. Si `.env.local` existe, sus valores tienen prioridad.
Nunca subas ningún `.env*` al repo.
