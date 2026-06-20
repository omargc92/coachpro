# Pendientes / mejoras

Lista viva. El repo es **público**; las credenciales demo ya fueron **rotadas y blindadas**
(viven solo en GitHub Secrets — ver [SECURITY.md](SECURITY.md)).

## ⏳ Pendiente
- [ ] **Configurar `ANTHROPIC_API_KEY` en Vercel** para activar la estimación de macros por
  foto (el código y la función `/api/estimar-macros` ya están desplegados; sin la key
  devuelve un error controlado). `vercel env add ANTHROPIC_API_KEY production` + redeploy.
- [ ] **Verificar el fix del SW en un dispositivo real** con caché previa (abrir la prod
  debería ofrecer "Actualizar" o cargar limpio, no colgarse). Validación manual en campo.
- [ ] (Opcional) **Proyecto Supabase separado solo para la demo pública**, aislado de datos reales.
- [ ] (Condicional) Si el bucket `fotos` se vuelve **privado**, servir imágenes con **URLs firmadas**.
- [ ] (Continuo) Próximas rondas de rediseño a partir de la auditoría
  (**[audit-coachpro.md](audit-coachpro.md)**), si se quiere seguir puliendo jerarquía/estados.

---

## ✅ Hecho (registro)
- **Seguridad:** credenciales demo **rotadas** (pass del coach + tokens de atletas) y movidas
  a **GitHub Secrets** (`QA_COACH_EMAIL/PASS/TOKEN`); placeholders en el repo. QA en CI verde
  usando los secrets.
- **Funcionalidad:** búsqueda de alimentos (Open Food Facts) con relevancia mejorada (español,
  sin ruido de 0 kcal, dedup); edición de objetivos de nutrición por el coach; estimación de
  macros desde foto con Claude visión (`/api/estimar-macros`, pendiente solo la API key).
- **Calidad de código:** eliminado el `setState` en fase de render de todos los sheets
  (montaje condicional + `useState(() => …)`).
- **CI:** warning de Node 20 silenciado; QA corre también en **deploys de preview**.
- **Responsividad / PWA standalone:** `viewport-fit=cover`, `100dvh`, safe-areas en
  Screen/Header/BottomNav/Sheet; sin franjas blancas en notch/gestos.
- **Service worker:** `autoUpdate` → `prompt` + `cleanupOutdatedCaches` + `ReloadPrompt`.
- **Diseño:** glifo "C" lima para iconos PWA (192/512/maskable/apple-touch).
- **Auditoría visual + responsividad:** [audit-coachpro.md](audit-coachpro.md) + `audit/`
  (contact sheet antes/después). Cero scroll horizontal, touch targets ≥44px.
- **Refinamiento (post-auditoría):** Fase 1 (A1–A5) + Fase 2 (B1–B5) — jerarquía de Header,
  cards de atleta, anillos hero con glow, handle de sheet, pill activo en BottomNav, press state.

---

## ✅ Hecho (registro)
- **Funcionalidad:** búsqueda de alimentos (Open Food Facts) y edición de objetivos de
  nutrición por el coach (versionado por fecha).
- **Calidad de código:** eliminado el `setState` en fase de render de todos los sheets
  (montaje condicional + `useState(() => …)`).
- **CI:** silenciado el warning de Node 20 (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`).
- **Responsividad / PWA standalone:** `viewport-fit=cover`, `100dvh` en todo, safe-areas
  (`env(safe-area-inset-*)`) en Screen/Header/BottomNav/Sheet, sin franjas blancas en notch/gestos.
- **Service worker:** `autoUpdate` → `prompt` + `cleanupOutdatedCaches` + `ReloadPrompt`
  ("Nueva versión disponible") para evitar el cuelgue al cargar.
- **Auditoría visual + responsividad:** [audit-coachpro.md](audit-coachpro.md) + `audit/`
  (script Playwright, contact sheet antes/después). Cero scroll horizontal, touch targets ≥44px.
- **Refinamiento (post-auditoría):**
  - Fase 1 (A1–A5): título+acción del detalle apilados · fila de búsqueda apilada ·
    etiqueta de eje sin recorte · chat anclado al fondo · empty-state/tip en Rutinas.
  - Fase 2 (B1–B5): jerarquía de Header · cards de atleta · anillos hero con glow ·
    handle de sheet · pill activo en BottomNav · press state en cards.
