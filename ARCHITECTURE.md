# CoachPro — Arquitectura

Mapa técnico del sistema: cómo fluye una request, el modelo de datos, el modelo de
seguridad (RLS), las Edge Functions de Stripe y el *gating* de planes.

> Para correr el proyecto ver [README.md](README.md). Para desplegar a producción ver
> [docs/despliegue.md](docs/despliegue.md).

---

## 1. Vista general

```
                          ┌─────────────────────────────────────────┐
   Navegador (PWA)         │              Supabase                   │
 ┌───────────────┐  anon   │  ┌────────┐  ┌──────┐  ┌─────────────┐  │
 │ Portal Atleta │────key──┼─▶│ RPCs   │─▶│ Post │  │  Storage    │  │
 │  (?token=)    │  RPC    │  │ SECDEF │  │ gres │  │ fotos /     │  │
 └───────────────┘         │  └────────┘  │ +RLS │  │ coach-logos │  │
 ┌───────────────┐  JWT    │  ┌────────┐  └──────┘  └─────────────┘  │
 │ Panel Coach   │────────┼─▶│ REST   │──────▲                       │
 │ (Auth login)  │         │  │ +RLS   │      │ service_role          │
 └───────┬───────┘         │  └────────┘  ┌───┴────────────────────┐  │
         │                 │              │ Edge Functions (Deno)  │  │
         │ fetch /api      │              │ stripe-* · set-plan    │  │
         ▼                 └──────────────┴───────────▲────────────┘  │
 ┌───────────────┐                                    │ webhook        │
 │ Vercel /api   │  estimar-macros → Claude visión    │                │
 └───────────────┘                          ┌─────────┴─────────┐      │
                                            │      Stripe        │      │
                                            └────────────────────┘      ┘
```

- **Frontend**: SPA React servida por Vercel. Un solo router (`src/App.jsx`) decide:
  `?token=` → **Portal Atleta**; sesión → **Panel Coach**; si no, **Landing/Login**.
- **Datos**: el panel del coach habla con Supabase por **REST + RLS** usando su JWT. El
  portal del atleta **no** tiene sesión: usa **RPCs `security definer`** que validan el token.
- **Pagos**: las **Edge Functions** (Deno) crean Checkout/Portal de Stripe y el **webhook**
  actualiza la suscripción con `service_role` (salta RLS).
- **IA**: `api/estimar-macros.js` (serverless de Vercel) llama a Claude visión; la API key
  vive solo en el servidor.

---

## 2. Multi-tenant

Cada **coach** es un tenant. El aislamiento se hace **en la base** (no en el cliente):

- `current_coach_id()` (`security definer`) resuelve el coach del usuario autenticado:
  `select id from coaches where auth_user_id = auth.uid()`.
- Todas las tablas de datos llevan políticas RLS `*_own` que filtran por `coach_id =
  current_coach_id()` (directo o vía `atleta_id in (… del coach)`).
- Un coach **nunca** ve datos de otro, aunque manipule la API: el filtro es server-side.

---

## 3. Modelo de datos

Tablas principales (`supabase/migrations/0001_init.sql` salvo que se indique):

| Tabla | Propósito |
| --- | --- |
| `coaches` | Tenant. Incluye `auth_user_id`, branding (`logo_url`, `brand_primary`, `brand_accent` — Fase A) y `onboarding_completado` (Fase D). |
| `atletas` | Clientes del coach. `token` (uuid) = acceso al portal; `activo` para soft-disable. |
| `mediciones` | Peso, % grasa, cintura por fecha (progreso). |
| `ejercicios` | Catálogo del coach (por grupo muscular). |
| `rutinas` / `rutina_ejercicios` | Rutina y sus ejercicios ordenados (series/reps/peso/descanso). |
| `asignaciones` | Rutina ↔ atleta ↔ día de la semana. |
| `sesiones` / `sesion_sets` | Sesión de entrenamiento del atleta y sus sets registrados. |
| `asistencias` | Check-in del atleta al gym por fecha. |
| `objetivos_nutricion` | Metas de macros del atleta (versionadas por fecha). |
| `comidas` | Registro de comidas (con foto opcional en Storage). |
| `mensajes` | Chat coach ↔ atleta. |
| `subscriptions` | **Fase B.** Plan y estado de suscripción del coach (1:1 con `coaches`). |

`subscriptions` (1 fila por coach, creada por trigger `init_coach_subscription`):

| Columna | Tipo | Notas |
| --- | --- | --- |
| `plan` | `plan_t` | `trial` · `expired` · `pro` · `premium` |
| `status` | `plan_status_t` | `active` · `read_only` |
| `trial_ends_at` | timestamptz | `now() + 14 días` por defecto |
| `current_period_end` | timestamptz | fin del periodo pagado (de Stripe) |
| `stripe_customer_id` / `stripe_subscription_id` | text | enlace con Stripe |

---

## 4. Seguridad (RLS)

### 4.1 Panel del coach — REST + RLS por propiedad
Políticas `*_own` `for all to authenticated` con `coach_id = current_coach_id()`. El coach
solo lee/escribe lo suyo. `subscriptions` es especial: **solo SELECT** para el coach; la
escritura queda reservada al `service_role` (Edge Functions de Stripe).

### 4.2 Portal del atleta — RPCs `security definer`
El atleta no tiene sesión (rol `anon`). Toda interacción pasa por funciones `security
definer` con `search_path` fijado que reciben el `token` y validan al atleta antes de
tocar datos:

`portal_perfil_y_rutina` · `portal_registrar_set` · `portal_marcar_asistencia` ·
`portal_nutricion` · `portal_registrar_comida` · `portal_progreso` · `portal_leer_mensajes` ·
`portal_enviar_mensaje` · `portal_sesion_hoy` · `portal_historial` · `portal_branding`.

> Como estas RPCs bypassan RLS por diseño, son la **superficie de confianza** del portal:
> cualquier cambio ahí debe revalidar el token y acotar al `atleta_id` correspondiente.

### 4.3 Enforcement del paywall — server-side (`0006`)
El *gating* de planes **no** se confía solo al cliente. En la base:

- **`coach_can_write()`** — `true` si la suscripción está `active`, el plan no es `expired`
  y no es un trial vencido (`plan='trial' and now() > trial_ends_at`).
- **Policies RESTRICTIVE** de escritura (`insert`/`update`/`delete`) en las 12 tablas de
  datos del coach: se aplican en **AND** con las `*_own`, exigiendo `coach_can_write()`.
  El **SELECT queda libre** → un coach `read_only` **sí puede leer** sus datos, no editarlos.
- **`enforce_athlete_limit()`** — trigger `before insert on atletas` que corta el alta al
  llegar al límite del plan (trial 3 · pro 25 · premium ∞).

> Las escrituras del portal del atleta (RPCs `security definer`) **no** se ven afectadas por
> estas policies `to authenticated`. Congelar también el portal cuando el coach expira sería
> una decisión de producto pendiente (tocar las RPCs `portal_*`).

---

## 5. Planes y gating (`src/lib/plans.js` + `usePlan.jsx`)

`PLANS` es la **fuente de verdad** de límites y features (cliente). `PlanProvider` resuelve
el *plan efectivo* (el trial puede expirar por tiempo en el cliente) y expone helpers:
`canWrite`, `isReadOnly`, `isTrial`, `isExpired`, `daysLeftInTrial`, `hasFeature(key)`,
`canAddAthlete(count)`.

| Plan | Máx atletas | Precio | Features |
| --- | --- | --- | --- |
| `trial` | 3 | 14 días gratis | chat, logo propio, dashboard de negocio |
| `pro` | 25 | $299 MXN/mes | + (sin colores custom / sin PDF) |
| `premium` | ∞ | $599 MXN/mes | + colores white-label, export PDF |
| `expired` | 0 | solo lectura | ninguna |

> ⚠️ Los límites/numbers están **duplicados** en `plans.js` (cliente) y en `0006` (SQL).
> Si cambias un límite, actualiza **ambos**.

---

## 6. Stripe Billing (Edge Functions)

| Función | Rol | Auth |
| --- | --- | --- |
| `create-checkout-session` | Crea/recupera el Customer y abre Checkout (Pro/Premium). | JWT del coach |
| `create-portal-session` | Abre el Customer Portal (gestionar/cancelar). | JWT del coach |
| `stripe-webhook` | Sincroniza `subscriptions` desde eventos de Stripe. | **Firma del webhook** |
| `set-plan-manual` | ⚠️ SOLO DEV — cambia el plan sin Stripe. | JWT + `ALLOW_MANUAL_PLAN=true` |

**Flujo de cobro:**
1. Coach → `create-checkout-session` → redirige a Stripe Checkout (`coach_id` en metadata).
2. Paga → Stripe dispara `checkout.session.completed` → `stripe-webhook` pone
   `plan` + `status='active'` + `current_period_end`.
3. Renovación (`invoice.paid`), cambio (`customer.subscription.updated`), cancelación
   (`customer.subscription.deleted`) y fallo tras reintentos (`invoice.payment_failed`)
   actualizan la fila vía `coachIdFromCustomer()`.
4. El front vuelve con `?checkout=success|cancelled` (banner en `App.jsx`).

**Seguridad clave:**
- El webhook **valida la firma** (`constructEventAsync`) antes de procesar — nunca confía en
  el body crudo.
- `set-plan-manual` es **fail-closed**: bloqueada salvo `ALLOW_MANUAL_PLAN=true`. En prod
  **no** se configura → solo el webhook puede cambiar planes.

Variables (secrets de Edge Functions): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_PRO`, `STRIPE_PRICE_PREMIUM`, `APP_URL`. `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase. Detalle en `.env.example` y
[docs/despliegue.md](docs/despliegue.md).

---

## 7. Estimación de macros por foto (`api/estimar-macros.js`)

Serverless de Vercel (ESM, `export default`). Recibe `{ imageUrl }`, llama a Claude
(`claude-haiku-4-5`, visión) con un *tool* de salida estructurada y devuelve
`{ descripcion, kcal, proteina_g, carbos_g, grasas_g, confianza }`. La `ANTHROPIC_API_KEY`
vive solo como env var en Vercel; sin ella la función devuelve un error controlado.

---

## 8. PWA y caché
`vite-plugin-pwa` en modo `prompt` (`ReloadPrompt` + `cleanupOutdatedCaches`) para evitar
cuelgues por caché vieja. App shell precacheado; datos de Supabase con **NetworkFirst**.
Headers de caché de `sw.js` / `manifest` (no cachear) y de `/assets/*` (immutable) en
`vercel.json`.

---

## 9. CI / QA
GitHub Actions (`.github/workflows/qa.yml`) corre `qa/run.mjs` (Playwright) en push/PR y
en deploys de preview, usando los secrets `QA_COACH_EMAIL/PASS` y `QA_TOKEN`. Checklist
manual en [QA.md](QA.md). Rotación de credenciales demo en [SECURITY.md](SECURITY.md).
