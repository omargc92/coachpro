# Despliegue a producción — CoachPro

Runbook para dejar CoachPro corriendo en producción: **Vercel** (frontend + `/api`),
**Supabase** (base + Edge Functions) y **Stripe** (cobro). Para la arquitectura ver
[ARCHITECTURE.md](../ARCHITECTURE.md).

> Orden recomendado: **1) Supabase → 2) Vercel → 3) Stripe + Edge Functions**.
> Stripe y la IA son opcionales: la app funciona sin ellas (con error controlado).

---

## 1. Supabase (base de datos)

1. Crea el proyecto y guarda *Project URL* y *anon key* (Settings → API).
2. **Aplica las migraciones** en el SQL Editor. Para un proyecto nuevo, pega completo
   [`supabase/migrations/EJECUTAR_EN_SUPABASE.sql`](../supabase/migrations/EJECUTAR_EN_SUPABASE.sql)
   (Fases A+B+D + enforcement, en una transacción `begin/commit`).
   - Si las Fases A/B/D ya estaban aplicadas, corre **solo**
     [`0006_fase_b_paywall_server.sql`](../supabase/migrations/0006_fase_b_paywall_server.sql)
     (es idempotente). **No** re-ejecutes el `EJECUTAR_…` si ya corrió antes.
3. Crea los buckets de Storage **públicos** `fotos` y `coach-logos` (sus políticas las
   crean las migraciones `0002` y `0003`).
4. Crea el usuario coach (Authentication → Users) o deja que se registre desde la app.

## 2. Vercel (frontend + /api)

1. Importa el repo en [vercel.com](https://vercel.com). Preset: **Vite**
   (`vercel.json` ya define build/output y el rewrite SPA que excluye `/api`).
2. **Env vars** (Project → Settings → Environment Variables):

   | Variable | Entorno | Valor |
   | --- | --- | --- |
   | `VITE_SUPABASE_URL` | Production (+ Preview) | URL del proyecto Supabase |
   | `VITE_SUPABASE_ANON_KEY` | Production (+ Preview) | anon key |
   | `ANTHROPIC_API_KEY` | Production | *(opcional)* key de console.anthropic.com para macros por foto |

   ```bash
   vercel env add ANTHROPIC_API_KEY production   # interactivo, no expone el valor
   ```
3. Deploy. Tras agregar/cambiar env vars, **redeploy** (`vercel --prod`) para que apliquen.

## 3. Stripe + Edge Functions

### 3.1 Productos y precios (Stripe Dashboard)
- **Products → Add product**: "CoachPro Pro" $299 MXN/mes recurrente → copia el `price_…` → `STRIPE_PRICE_PRO`.
- Repite "CoachPro Premium" $599 MXN/mes → `STRIPE_PRICE_PREMIUM`.

### 3.2 Secrets de las Edge Functions (Supabase)
```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_PRO=price_... \
  STRIPE_PRICE_PREMIUM=price_... \
  APP_URL=https://TU_APP.vercel.app
```
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase automáticamente.
- ⚠️ **No** configures `ALLOW_MANUAL_PLAN` en producción (deja `set-plan-manual` bloqueada).

### 3.3 Desplegar las funciones
```bash
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
# set-plan-manual: solo si lo quieres en un entorno de dev
```

### 3.4 Webhook (Stripe Dashboard)
- **Webhooks → Add endpoint**: `https://TU_PROYECTO.supabase.co/functions/v1/stripe-webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
- Copia el **Signing secret** → es el `STRIPE_WEBHOOK_SECRET` del paso 3.2 (re-`set` si cambió).

---

## 4. Verificación post-deploy

- [ ] Login del coach funciona; el panel carga.
- [ ] Portal del atleta abre con `/?token=…` y solo muestra sus datos.
- [ ] **Paywall server-side:** un coach `read_only` recibe error al escribir vía API directa
      (no solo en la UI). Un coach en trial no puede crear más de 3 atletas.
- [ ] **Stripe (modo test):** Checkout con tarjeta `4242 4242 4242 4242` → el webhook deja el
      plan en `pro/premium` en ~segundos → el banner `?checkout=success` aparece.
- [ ] **Cancelación:** Customer Portal → cancelar → el plan cae a `read_only`.
- [ ] *(Si configuraste IA)* subir foto de plato devuelve una estimación de macros.

Tarjetas de prueba y flujo detallado en [`.env.example`](../.env.example).

---

## 5. Notas operativas

- **Credenciales / rotación:** ver [SECURITY.md](../SECURITY.md). Demo pública blindada
  (credenciales en GitHub Secrets).
- **Pendientes conocidos:** ver [TODO.md](../TODO.md) (p. ej. policy `update` del bucket
  `coach-logos`; rotar `service_role` si se expuso).
- **CI:** el check `qa` (Playwright) corre en push/PR y en deploys de preview.
