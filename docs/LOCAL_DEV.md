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
4. En **SQL Editor**, pega y ejecuta el contenido de `supabase/EJECUTAR_EN_SUPABASE.sql`.
5. Ve a **Authentication → Users → Add user**:
   - Email: `coach@coachpro.test`
   - Password: `Demo1234!`
   - Marca "Auto Confirm User"
6. Crea el archivo `.env.local` con tus credenciales (ya existe la plantilla).
7. Corre la app:
   ```bash
   npm run dev
   ```
8. Abre `http://localhost:5173` → login con `coach@coachpro.test` / `Demo1234!`

**URLs del portal atleta (tokens fijos del seed):**
```
Ana:   http://localhost:5173/?token=11111111-1111-1111-1111-111111111111
Luis:  http://localhost:5173/?token=22222222-2222-2222-2222-222222222222
Marta: http://localhost:5173/?token=33333333-3333-3333-3333-333333333333
```

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
