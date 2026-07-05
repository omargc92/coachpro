Fase B — Modelo de planes, estados de suscripción y gating ✅ COMPLETADA

Contexto: continúa de Fase A. Mismo stack. Ahora construimos la lógica de planes y los límites, con un flag MANUAL de plan (sin Stripe aún) para poder probar todo antes de conectar el cobro en Fase C.

MODELO DE NEGOCIO (definido):
- Paga el COACH. Atletas acceden gratis vía link de portal.
- Trial de 14 días sin tarjeta al registrarse.
- Al terminar el trial sin pago → cuenta en estado READ-ONLY (ve todo, no puede crear/editar/borrar).
- Límites combinados: por número de atletas activos Y por features.

PLANES:
- TRIAL (14 días): hasta 3 atletas, todas las features Pro desbloqueadas para que prueben.
- FREE/EXPIRED (post-trial sin pago): READ-ONLY. Ve sus datos, no opera.
- PRO ($299 MXN/mes): hasta 25 atletas. Incluye chat, logo propio, dashboard de negocio.
- PREMIUM ($599 MXN/mes): atletas ilimitados. Todo lo de Pro + colores white-label + export PDF de progreso.

1) Supabase:
- Tabla "subscriptions" (o columnas en perfil del coach): plan (enum: trial/expired/pro/premium), status (active/read_only), trial_ends_at (timestamp), current_period_end (timestamp, para Fase C), stripe_customer_id (nullable, para Fase C), stripe_subscription_id (nullable).
- Al crear un coach nuevo, inicializa plan=trial, trial_ends_at = now()+14d, status=active.
- RLS: cada coach solo lee/escribe su propia suscripción. El cambio de plan NO debe ser escribible desde el cliente (solo vía service role / Edge Function) — por ahora deja una Edge Function "set_plan_manual" protegida para pruebas.

2) Definición central de límites:
- Crea un archivo único (ej. src/lib/plans.js) que exporte la matriz de planes: para cada plan, { maxAthletes, features: { chat, ownLogo, customColors, exportPdf, businessDashboard }, canWrite }. Toda la app lee de aquí (single source of truth).

3) Lógica de gating (hook usePlan / useEntitlements):
- Resuelve el plan actual del coach y si trial venció (compara trial_ends_at con now; si venció y no pagó → tratar como expired/read_only).
- Expone helpers: canAddAthlete(currentCount), hasFeature(key), canWrite, isReadOnly, daysLeftInTrial.

4) Aplicación del gating en UI:
- READ-ONLY: cuando status=read_only, deshabilita todos los botones de crear/editar/borrar en TODA la app del coach, con tooltip "Reactiva tu plan para editar". Los datos se siguen viendo.
- Límite de atletas: al intentar "Nuevo atleta" si ya alcanzó el máximo, muestra un modal de upgrade ("Llegaste al límite de tu plan, mejora para agregar más") en vez de crear.
- Features bloqueadas: chat, branding (logo/colores), export PDF, dashboard — si el plan no las incluye, muestra estado bloqueado con CTA de upgrade en vez de la feature.
- Conecta el branding de Fase A al gating: logo solo si features.ownLogo; colores solo si features.customColors.

5) Banner de trial:
- Muestra un banner discreto en el panel del coach: "Te quedan X días de prueba" con CTA "Ver planes". Cuando esté en read-only: banner naranja "Tu prueba terminó — reactiva para seguir editando".

6) Pantalla de Planes/Precios (in-app):
- Pantalla que muestre los 3 planes (tabla comparativa), el plan actual del coach resaltado, y botón "Elegir plan" (en Fase C disparará Stripe; por ahora llama a la Edge Function manual para cambiar de plan y poder probar todos los estados).

Reglas: inline styles, sin Tailwind. El gating debe fallar CERRADO (ante duda, restringe). No confíes solo en el cliente: la verdad del plan vive en Supabase y se valida con RLS; el gating de UI es UX, no seguridad. Documenta el modelo de datos y cómo simular cada estado (trial activo, trial vencido, pro, premium) con la Edge Function manual. Build + deploy.

---

## Implementación

**Migración:** `supabase/migrations/0004_fase_b_planes.sql`
- Tabla `subscriptions`: `plan` (enum trial/expired/pro/premium), `status` (active/read_only),
  `trial_ends_at`, `current_period_end`, `stripe_customer_id`, `stripe_subscription_id`.
- Trigger: al insertar un coach nuevo → inicializa `plan=trial`, `trial_ends_at = now()+14d`.
- RLS: cada coach solo lee su propia suscripción; escritura solo vía service role.

**Archivos creados/modificados:**
- `src/lib/plans.js` — fuente única de verdad: matriz de planes con `maxAthletes`, `features`, `canWrite`.
- `src/lib/usePlan.jsx` — `PlanProvider` + `usePlan` hook. Resuelve expiración de trial en cliente.
  Expone: `plan`, `isReadOnly`, `canWrite`, `isTrial`, `isExpired`, `daysLeftInTrial`, `hasFeature(key)`, `canAddAthlete(count)`.
- `src/pages/coach/Planes.jsx` — tabla comparativa de planes, plan actual resaltado, botones de acción.
- Toda la app del coach — gating aplicado: READ-ONLY, límite de atletas con modal, features bloqueadas con CTA.

**Simular estados (dev):**
```
# Trial activo (default al registrarse)
# Trial vencido: ajustar trial_ends_at a fecha pasada vía set-plan-manual
# Pro / Premium: supabase functions invoke set-plan-manual --body '{"plan":"pro"}'
```

**Edge Function `set-plan-manual`:** solo para entornos de dev/staging. En producción el plan
cambia únicamente por webhook de Stripe (Fase C).