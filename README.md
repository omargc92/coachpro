# CoachPro

[![QA (Playwright)](https://github.com/omargc92/coachpro/actions/workflows/qa.yml/badge.svg)](https://github.com/omargc92/coachpro/actions/workflows/qa.yml)

App web **mobile-first** (PWA instalable) de coaching fitness **multi-tenant**: cada
entrenador es un *tenant* que da seguimiento a sus clientes (rutinas, nutrición,
asistencia al gym y progreso), con **planes de suscripción** y cobro vía Stripe.

- **Entrenador (coach):** login email/password; gestiona atletas, rutinas, nutrición,
  agenda, chat, su branding y su suscripción.
- **Atleta (cliente):** entra por link con token (`/?token=UUID`), sin contraseña; solo
  ve lo suyo. Las escrituras del portal pasan por RPCs `security definer`.
- **Feature estrella:** *Score de Disciplina* (0–100) que resume asistencia + rutina + nutrición.
- **Monetización:** trial de 14 días → planes **Pro** / **Premium** (Stripe Billing en MXN),
  con *gating* de features y límites por plan **aplicados en cliente y en la base** (RLS).

## Stack

React 18 + Vite (JSX, sin TypeScript) · Supabase (Postgres + Auth + Storage + Edge Functions) ·
TanStack Query · estilos 100% inline · Tabler Icons (CDN) · Recharts · jsPDF ·
Stripe Billing · PWA (`vite-plugin-pwa`) · Claude (visión, estimación de macros) · Deploy en Vercel.

## Documentación

| Doc | Para qué |
| --- | --- |
| **README.md** (este) | Overview, quickstart local, estructura |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Modelo de datos, RLS/seguridad, Edge Functions, planes |
| [docs/despliegue.md](docs/despliegue.md) | Runbook de producción (Supabase + Stripe + Vercel) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Flujo de trabajo, ramas, PRs, convenciones |
| [docs/ayuda/](docs/ayuda/) | **Centro de ayuda para usuarios** (guías de coach y atleta) |
| [DESIGN.md](DESIGN.md) | Design system (paleta, tipografía, componentes) |
| [SECURITY.md](SECURITY.md) | Runbook de seguridad y rotación de credenciales |
| [QA.md](QA.md) | Checklist de QA manual |
| [docs/roadmap/](docs/roadmap/) | Specs de las Fases A–D (branding, planes, Stripe, retención) |
| [TODO.md](TODO.md) | Pendientes vivos |

---

## Quickstart (local)

### 1. Requisitos
- Node 18+ y npm.
- Una cuenta de [Supabase](https://supabase.com) (proyecto gratis sirve).
- *(Opcional)* Cuenta de Stripe para probar el cobro, y una `ANTHROPIC_API_KEY` para la
  estimación de macros por foto. Ambas son opcionales en local: la app funciona sin ellas.

### 2. Configurar Supabase
1. **Crea el proyecto** → guarda *Project URL* y *anon public key* (Project Settings → API).
2. **Corre las migraciones** (en orden) en el **SQL Editor**, o pega
   [`supabase/migrations/EJECUTAR_EN_SUPABASE.sql`](supabase/migrations/EJECUTAR_EN_SUPABASE.sql)
   (Fases A+B+D + enforcement, en una transacción):
   - `0001_init.sql` — tablas, enums, RLS y RPC del portal del atleta.
   - `0002_fase3_4.sql` — RPC extra (racha) + políticas de Storage del bucket `fotos`.
   - `0003_fase_a_branding.sql` — branding por coach + bucket `coach-logos`.
   - `0004_fase_b_planes.sql` — tabla `subscriptions`, enums de plan, trigger de trial.
   - `0005_fase_d_onboarding.sql` — flag `onboarding_completado`.
   - `0006_fase_b_paywall_server.sql` — **enforcement server-side** del paywall.
   - `0007_fotos_progreso.sql` — tabla `fotos_progreso` + RPCs del portal + RLS del coach.
   - `0008_asignaciones_multidia.sql` — índice único parcial: una rutina activa por (atleta, día).
   - `0009_portal_rutina_semanal.sql` — RPC `portal_rutina_semanal` (rutina completa del atleta para PDF).
   - `0010_plan_fit_enum.sql` — agrega el valor `fit` al enum `plan_t` (correr **antes** de la 0011).
   - `0011_plan_fit_gating.sql` — límite de atletas de `fit` + `portal_branding.chat_enabled` (oculta asesoría).
   - `0012_sesion_sets_idempotente.sql` — registro de sets idempotente (soporte de cola offline).
   - `0013_portal_export_pdf_flag.sql` — `portal_branding.export_pdf` (gating Premium del PDF del atleta).
   - `0014_coach_brand_name.sql` — `coaches.brand_name` (nombre de la app configurable) + `portal_branding`.
3. **Crea el usuario coach** (Authentication → Users → Add user, o "Crear cuenta" en la app).
4. **Empieza de cero**: no hay datos precargados. El coach da de alta su propio catálogo de
   ejercicios, atletas y rutinas desde la app (Catálogo → "Nuevo ejercicio", etc.).

#### Buckets de Storage
| Bucket | Público | Uso | Políticas |
| --- | --- | --- | --- |
| `fotos` | Sí | Fotos de plato y de progreso (sube el atleta, rol `anon`) | `0002_fase3_4.sql` |
| `coach-logos` | Sí | Logo de marca de cada coach (`{coach_id}/logo.ext`) | `0003_fase_a_branding.sql` |

### 3. Variables de entorno
```bash
cp .env.example .env
```
```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```
> Los secretos de Stripe y `ANTHROPIC_API_KEY` **no** van aquí: viven en los *secrets* de
> las Edge Functions de Supabase y en las env de Vercel. Ver [docs/despliegue.md](docs/despliegue.md).

### 4. Correr
```bash
npm install
npm run dev
```
- **Coach:** `http://localhost:5173` → login.
- **Atleta:** `http://localhost:5173/?token=UUID` (token que genera la app al crear un atleta).

---

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (Vite). |
| `npm run build` | Build de producción a `dist/`. |
| `npm run preview` | Sirve el build (para probar la PWA / Lighthouse). |
| `npm run qa` | Corre el QA automatizado (Playwright, `qa/run.mjs`). Requiere `QA_*` en el entorno. |
| `npm run gen:icons` | Regenera iconos PWA + logo desde `public/logo-source.png` (`sips`, macOS). |

---

## Estructura

```
api/
  estimar-macros.js        Serverless (Vercel): estima macros de una foto con Claude visión
src/
  main.jsx · App.jsx       Router raíz: Portal Atleta (?token=) | Landing/Login | Panel Coach
  lib/
    supabase.js auth.jsx   Cliente Supabase + contexto de sesión
    queries.js             TanStack Query: coach, atletas, suscripción, datos
    usePlan.jsx plans.js   Planes, entitlements y gating (fuente de verdad de límites)
    branding.jsx           Branding por coach (logo + colores) para portal y panel
    theme.js ui.jsx        Design system (tokens + componentes inline)
    score.js               Cálculo del Score de Disciplina
    foods.js chat.jsx      Búsqueda de alimentos (Open Food Facts) · chat
    exportPdf.js           Export PDF de progreso (jsPDF)
    pwa.jsx ErrorBoundary.jsx
  pages/
    Landing.jsx Pages.jsx
    coach/    Login, Onboarding, Atletas, AtletaDetalle, Rutinas, Catalogo,
              Agenda, ChatCoach, Dashboard (negocio), Planes, Configuracion
    atleta/   Portal, Hoy, Nutricion, Progreso, ChatAtleta
supabase/
  migrations/  0001…0007 + EJECUTAR_EN_SUPABASE.sql
  functions/   create-checkout-session · create-portal-session · stripe-webhook · set-plan-manual
scripts/
  gen-icons.sh             Iconos PWA + logo
  rotar-credenciales.mjs   Rota credenciales demo (ver SECURITY.md)
qa/
  run.mjs README.md        QA automatizado (Playwright)
```

---

## PWA (app instalable)
- Manifest, service worker (modo `prompt` + `cleanupOutdatedCaches`) e iconos vía `vite-plugin-pwa`.
- App shell precacheado; datos de Supabase con **NetworkFirst**.
- `viewport-fit=cover`, `100dvh` y safe-areas para modo standalone (sin franjas en el notch).
- Iconos/logo desde `public/logo-source.png` con `npm run gen:icons`.
- Verifica "Installable" con `npm run build && npm run preview` + Lighthouse.

> **Push en iOS:** soporte limitado en PWA; **fuera de alcance** en esta versión.

## Deploy
Resumen: importar el repo en Vercel (preset **Vite**), configurar `VITE_SUPABASE_*`, y aplicar
las migraciones + desplegar las Edge Functions + secrets de Stripe. El paso a paso completo
(incluido el webhook de Stripe y la `ANTHROPIC_API_KEY`) está en **[docs/despliegue.md](docs/despliegue.md)**.

---

## Roadmap (fases construidas)

### Producto base
- **Fase 1:** scaffold + Supabase + migración + auth coach + seed + PWA base. ✅
- **Fase 2:** portal entrenador (atletas, detalle, catálogo). ✅
- **Fase 3:** rutinas (builder + asignación) + portal atleta "Hoy" + Score de Disciplina. ✅
- **Fase 4:** nutrición (objetivos, comidas, foto a Storage) + progreso (Recharts) + chat. ✅

### SaaS y monetización
- **Fase A:** branding por coach — logo propio + colores white-label en portal del atleta. ✅
- **Fase B:** modelo de planes (Trial/Pro/Premium), gating de features y límite de atletas. ✅
- **Fase C:** Stripe Billing — suscripciones recurrentes en MXN, webhooks, Customer Portal. ✅
- **Fase D:** onboarding guiado, landing pública con precios, dashboard de negocio, export PDF. ✅

Specs detalladas en [docs/roadmap/](docs/roadmap/).
