# Pendientes / mejoras

Lista viva. El repo es **público**; las credenciales demo ya fueron **rotadas y blindadas**
(viven solo en GitHub Secrets — ver [SECURITY.md](SECURITY.md)).

## ⏳ Pendiente
- [ ] **(Seguridad) Rotar el `service_role` key de Supabase** — quedó expuesto en un chat al
  re-rotar las credenciales demo. Supabase Dashboard → Settings → API → JWT Settings → Rotate.
  Ojo: invalida también la `anon` key → actualizar `VITE_SUPABASE_ANON_KEY` en Vercel + redeploy.
- [ ] **Verificar el fix del SW en un dispositivo real** con caché previa (abrir la prod
  debería ofrecer "Actualizar" o cargar limpio, no colgarse). Validación manual en campo.
- [ ] (Opcional) **Proyecto Supabase separado solo para la demo pública**, aislado de datos reales.
- [ ] (Condicional) Si el bucket `fotos` se vuelve **privado**, servir imágenes con **URLs firmadas**.
- [ ] (Continuo) Próximas rondas de rediseño a partir de la auditoría
  (**[audit-coachpro.md](audit-coachpro.md)**), si se quiere seguir puliendo jerarquía/estados.

---

## ✅ Hecho (registro)

### Cambios recientes
- **Eliminar análisis de macros por IA:** removido el botón "Estimar con IA", la función
  `estimarConIA()` y el disclaimer de IA en `Nutricion.jsx`. El archivo `api/estimar-macros.js`
  se conserva inactivo. La foto del plato sigue funcionando para previsualizar la comida.
- **Eliminar atleta (soft delete):** botón "Eliminar atleta" en `AtletaDetalle` con sheet de
  confirmación. Llama a `useArchivarAtleta` → `UPDATE atletas SET activo = false`. Los datos
  del atleta se conservan en la BD.
- **Fotos de progreso:** nueva tabla `fotos_progreso` (`0006_fotos_progreso.sql`). El atleta
  sube fotos desde la pestaña "Progreso" (RPCs `portal_agregar_foto_progreso` /
  `portal_fotos_progreso`). El coach ve la galería cronológica en `AtletaDetalle`.
- **Catálogo de ejercicios:** ya existía — el coach puede crear/editar/eliminar ejercicios
  desde la pestaña "Catálogo" con el botón `+`.

### Fases de producto A–D (SaaS)
- **Fase A — Branding por coach:** bucket `coach-logos`, columnas `logo_url`/`brand_primary`/
  `brand_accent` en perfil del coach (`0003_fase_a_branding.sql`). Uploader de logo en
  Configuración (PNG/JPG/SVG, máx 1 MB, preview). Color pickers con preview en vivo.
  Hook `useBranding` + `BrandingProvider`: portal del atleta muestra logo y colores del coach.
- **Fase B — Planes y gating:** tabla `subscriptions` (`0004_fase_b_planes.sql`). Trial de 14 días
  auto-iniciado al registrarse. `src/lib/plans.js` como fuente única de verdad (Trial/Expired/Pro/Premium).
  Hook `usePlan` con helpers `hasFeature`, `canWrite`, `canAddAthlete`, `daysLeftInTrial`.
  Gating aplicado en toda la UI: READ-ONLY al expirar, límite de atletas con modal de upgrade,
  features bloqueadas con CTA. Banner de trial y pantalla de Planes con tabla comparativa.
  Edge Function `set-plan-manual` para pruebas de dev.
- **Fase C — Stripe Billing:** Edge Functions `create-checkout-session`, `create-portal-session`,
  `stripe-webhook` (verifica firma, procesa `checkout.session.completed`, `subscription.updated/deleted`,
  `invoice.paid/payment_failed`). Pantalla de Planes conectada a Stripe Checkout. Botón
  "Gestionar suscripción" via Customer Portal. Cambio de plan solo vía webhook (service role).
- **Fase D — Activación y retención:**
  - Onboarding guiado (3 pasos: logo, primer atleta, compartir link) con barra de progreso;
    persiste flag `onboarding_completado` en BD (`0005_fase_d_onboarding.sql`).
  - Landing pública con sección de precios y CTA "Empieza gratis 14 días"; SEO en `index.html`
    (title, description, JSON-LD Product/Offer).
  - Dashboard de negocio (`hasFeature('businessDashboard')`, Pro+): nº atletas vs límite,
    adherencia promedio, atletas en riesgo, gráfica de scores con Recharts.
  - Export PDF de progreso (`hasFeature('exportPdf')`, Premium): datos del atleta, gráfica
    peso/medidas, adherencia, logo del coach en encabezado. Generado con jsPDF.

### Funcionalidad core (Fases 1–4)
- Búsqueda de alimentos (Open Food Facts) con relevancia mejorada (español, sin ruido de 0 kcal,
  dedup); edición de objetivos de nutrición por el coach; estimación de macros desde foto con
  Claude visión (`/api/estimar-macros`, pendiente solo la API key en Vercel).
- Calidad de código: eliminado el `setState` en fase de render de todos los sheets
  (montaje condicional + `useState(() => …)`).

### Infraestructura y calidad
- **Seguridad:** credenciales demo **rotadas** (pass del coach + tokens de atletas) y movidas
  a **GitHub Secrets** (`QA_COACH_EMAIL/PASS/TOKEN`); placeholders en el repo. QA en CI verde.
- **CI:** warning de Node 20 silenciado; QA corre también en **deploys de preview**.
- **Responsividad / PWA:** `viewport-fit=cover`, `100dvh`, safe-areas en Screen/Header/BottomNav/Sheet;
  sin franjas blancas en notch/gestos. Cero scroll horizontal, touch targets ≥44px.
- **Service worker:** `autoUpdate` → `prompt` + `cleanupOutdatedCaches` + `ReloadPrompt`.
- **Diseño:** glifo "C" lima para iconos PWA (192/512/maskable/apple-touch).
- **Auditoría visual:** [audit-coachpro.md](audit-coachpro.md) + `audit/` (contact sheet antes/después).
- **Refinamiento (post-auditoría):** jerarquía de Header, cards de atleta, anillos hero con glow,
  handle de sheet, pill activo en BottomNav, press state en cards.
