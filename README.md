# CoachPro

[![QA (Playwright)](https://github.com/omargc92/coachpro/actions/workflows/qa.yml/badge.svg)](https://github.com/omargc92/coachpro/actions/workflows/qa.yml)

App web **mobile-first** (PWA instalable) de coaching fitness para **un solo entrenador**
que da seguimiento a sus clientes: rutinas, nutrición, asistencia al gym y progreso.

- **Entrenador (admin):** login email/password, gestiona todo.
- **Atleta (cliente):** accede por link con token (`/?token=UUID`), sin contraseña; solo ve lo suyo.
- **Feature estrella:** *Score de Disciplina* (0–100) que resume asistencia + rutina + nutrición.

## Stack

React 18 + Vite (JSX, sin TypeScript) · Supabase (Postgres + Auth + Storage) ·
TanStack Query · estilos 100% inline · Tabler Icons (CDN) · Recharts · PWA (`vite-plugin-pwa`) · Deploy en Vercel.

---

## 1. Requisitos

- Node 18+ y npm.
- Una cuenta de [Supabase](https://supabase.com) (proyecto gratis sirve).

## 2. Configurar Supabase

1. **Crea el proyecto** en supabase.com → guarda la *Project URL* y la *anon public key*
   (Project Settings → API).
2. **Corre las migraciones** (en orden) en el **SQL Editor**:
   1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tablas, enums, RLS y RPC del portal.
   2. [`supabase/migrations/0002_fase3_4.sql`](supabase/migrations/0002_fase3_4.sql) — RPC extra
      (`portal_sesion_hoy`, `portal_historial` para la racha) y **políticas de Storage** del bucket `fotos`.
3. **Crea el usuario coach** (para poder iniciar sesión):
   - Opción A: arranca la app (`npm run dev`), abre el login y usa **"Crear cuenta"**.
   - Opción B: Dashboard → Authentication → Users → **Add user** (email + password).
   > Si tu proyecto exige confirmación de correo, desactívala en
   > Authentication → Providers → Email para el demo, o confirma el usuario manualmente.
4. **Seed de datos demo:** edita `v_email` en
   [`supabase/seed.sql`](supabase/seed.sql) para que sea el email del coach que creaste,
   y ejecútalo en el SQL Editor. Crea 1 coach, 3 atletas (Ana, Luis, Marta), catálogo de
   ejercicios, 1 rutina (Full Body A) asignada lun/mié/vie, objetivos de nutrición,
   mediciones, asistencias, comidas y mensajes de ejemplo.
   Al final imprime (pestaña **Messages/Notices**) los **tokens de portal** de cada atleta.

### Buckets de Storage (crear manualmente)

En **Storage → New bucket**, crea:

| Bucket  | Público | Uso                                            |
| ------- | ------- | ---------------------------------------------- |
| `fotos` | Sí      | Fotos de plato (nutrición) y de progreso       |

> El portal del atleta (rol `anon`) sube a `fotos`. Crea el bucket **antes** de subir fotos.
> Las políticas de acceso (INSERT/SELECT para `anon` y `authenticated`) las crea la migración
> `0002_fase3_4.sql`. Marca el bucket como **público** para servir las imágenes por URL directa;
> si lo dejas privado, habría que migrar a URLs firmadas.

## 3. Variables de entorno

```bash
cp .env.example .env
```

Rellena `.env`:

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

## 4. Correr en local

```bash
npm install
npm run dev
```

- **Coach:** abre `http://localhost:5173` → login.
- **Atleta:** `http://localhost:5173/?token=UUID` (usa un token del seed).

---

## PWA (app instalable)

- Manifest, service worker (`registerType: autoUpdate`) e iconos vía `vite-plugin-pwa`.
- App shell precacheado; datos de Supabase con estrategia **NetworkFirst** (no se cachean agresivo).
- Meta tags de iOS incluidos en `index.html` (`apple-mobile-web-app-capable`,
  `status-bar-style: black-translucent`, `apple-touch-icon`).
- En el portal del atleta aparece un **banner discreto de instalación** cuando el navegador
  lo permite; en iOS muestra la instrucción "Compartir → Agregar a inicio".
- **Iconos y logo** se generan desde `public/logo-source.png` con `npm run gen:icons`
  (usa `sips`, nativo de macOS). Produce `public/icons/icon-192·512·512-maskable.png`,
  `public/apple-touch-icon.png` (180×180) y `public/logo.png` (logo in-app del login,
  header del portal y banner de instalación). Para cambiar el logo: reemplaza
  `public/logo-source.png` (cuadrado) y corre `npm run gen:icons`.
- La PWA se sirve sobre el build de producción. Verifica "Installable" con Lighthouse:
  ```bash
  npm run build && npm run preview   # abre la URL y corre Lighthouse → PWA → Installable
  ```

> **Notificaciones push:** en iOS el soporte de push en PWA es limitado; **fuera de alcance**
> en esta versión. Si se requieren, se evaluaría Capacitor más adelante.

---

## Deploy en Vercel

1. Sube el repo a GitHub e importa el proyecto en [vercel.com](https://vercel.com).
2. Framework preset: **Vite**. Build: `npm run build` · Output: `dist`.
3. Configura las env vars `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el proyecto.
4. `vercel.json` ya incluye el rewrite SPA (todas las rutas → `index.html`).
5. Deploy. La PWA queda servida sobre HTTPS (requisito para instalación).

---

## Estructura

```
src/
  lib/      supabase, theme (tokens), ui (componentes), score, queries, auth, pwa
  pages/    coach/ (login, atletas, detalle, rutinas, catálogo, agenda, chat)
            atleta/ (hoy, nutrición, progreso, chat)
supabase/   migrations/0001_init.sql · seed.sql
scripts/    gen-icons.sh (genera iconos PWA + logo desde public/logo-source.png)
```

## Fases de construcción

- **Fase 1:** scaffold + Supabase + migración + auth coach + seed + PWA base. ✅
- **Fase 2:** portal entrenador (atletas, detalle, catálogo). ✅
- **Fase 3:** rutinas (builder + asignación) + portal atleta "Hoy" + Score de Disciplina. ✅
- **Fase 4:** nutrición (objetivos, comidas, foto a Storage) + progreso (Recharts) + chat. ✅
