# Pendientes / mejoras

Lista viva. El repo es **público** y la demo se deja **abierta a propósito** por ahora;
los puntos de seguridad de abajo son para cuando se quiera blindar.

## 🔐 Seguridad / demo (repo público) — pendiente, requiere tu acción
Runbook completo de rotación en **[SECURITY.md](SECURITY.md)**. El código ya soporta
secrets con fallback al default demo, así que rotar no rompe nada.
- [ ] **Rotar credenciales demo** (pass del coach + tokens de atletas) — requiere acceso a Supabase.
- [ ] **Crear los GitHub Secrets** `QA_COACH_EMAIL/PASS/TOKEN` — requiere ajustes del repo.
- [ ] (Opcional) **Proyecto Supabase separado solo para la demo pública**, aislado de datos reales.

## ✨ Funcionalidad
- [ ] (Opcional) Estimación automática de macros desde la **foto del plato**
  (hoy la foto se guarda y el coach valida a mano).
- [ ] **Relevancia de la búsqueda de alimentos**: Open Food Facts devuelve ruido internacional
  (marcas FR/AR, ítems con 0 kcal). Filtrar por idioma/país o usar otra fuente (USDA) mejoraría
  los resultados. *(Detectado en la auditoría; es producto, no layout.)*

## 🗄️ Storage
- [ ] Si el bucket `fotos` se vuelve **privado**, servir imágenes con **URLs firmadas**
  (hoy se asume bucket público y URL directa).

## 📱 PWA / service worker
- [ ] **Verificar el fix del SW en un dispositivo real** que ya tenga el SW viejo cacheado:
  abrir la prod debería ofrecer "Actualizar" (o cargar limpio) en vez de colgarse.
  *(El cambio a `registerType:'prompt'` + `cleanupOutdatedCaches` está desplegado; falta validar
  en campo el caso del usuario con caché previa.)*

## ⚙️ CI / mantenimiento
- [ ] (Opcional) Correr el QA también en **deploys de preview**, no solo producción.

## 🎨 Diseño
- [ ] Versión "glifo" simplificada del logo para iconos chicos (192px), ya que el logo
  actual es una foto con detalle que se reduce mucho en tamaños pequeños.
- [ ] (Continuo) Próximas rondas de rediseño a partir de la auditoría
  (**[audit-coachpro.md](audit-coachpro.md)**), si se quiere seguir puliendo jerarquía/estados.

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
