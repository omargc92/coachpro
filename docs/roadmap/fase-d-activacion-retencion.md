Fase D — Mejoras de activación y retención ✅ COMPLETADA

Contexto: continúa de Fase C. App ya con suscripciones funcionando. Ahora features que suben conversión de trial→pago y retención. Implementa en este orden, cada una independiente:

1) Onboarding guiado (primer login del coach):
- Checklist de 3 pasos que aparece la primera vez: (a) Sube tu logo, (b) Crea tu primer atleta, (c) Comparte el link del portal. Barra de progreso, se puede saltar, no vuelve a aparecer una vez completado (persistir flag en perfil).

2) Página de precios pública en el landing:
- Sección de precios en la landing pública (no in-app) con los 3 planes, comparativa, y CTA "Empieza gratis 14 días" → registro. SEO básico (title, description, JSON-LD de Product/Offer).

3) Dashboard de negocio del coach (feature de plan Pro+):
- Vista con: nº de atletas activos vs límite del plan, adherencia promedio (asistencia + nutrición), y lista de "atletas en riesgo" (sin registrar actividad en N días). Gráficas con el patrón de Recharts ya usado. Respeta el gating: bloqueada en plan que no la incluye.

4) Export PDF de progreso del atleta (feature Premium):
- Botón en AtletaDetalle que genere un PDF con: datos del atleta, gráfica de progreso (peso/medidas), adherencia, rango de fechas. Usa el patrón de generación de PDF ya existente. Branding del coach (logo) en el encabezado del PDF. Gating: solo Premium.

Reglas: inline styles, sin Tailwind. Respeta gating de Fase B/C (cada feature chequea hasFeature/canWrite). No rompas responsividad ni safe-areas. Build + deploy. Documenta cada feature y su gating.

---

## Implementación

### 1) Onboarding guiado
- **Migración:** `supabase/migrations/0005_fase_d_onboarding.sql` — columna `onboarding_completado` en coaches.
- **Archivo:** `src/pages/coach/Onboarding.jsx` — overlay con 3 pasos y barra de progreso.
  - Paso 1 "Sube tu logo" → detecta `coach.logo_url` (se marca al guardar branding).
  - Paso 2 "Crea tu primer atleta" → detecta `atletas.length > 0`.
  - Paso 3 "Comparte el link" → copia URL del portal al portapapeles, marca `step3Done`.
  - Auto-finaliza al completar los 3; persiste flag vía `useCompletarOnboarding` mutation.
- Aparece como overlay sobre la app hasta que se completa o se salta.

### 2) Landing pública con precios
- **Archivo:** `src/pages/Landing.jsx` — visible a usuarios no autenticados.
  Sección de precios con tabla comparativa (Trial/Pro/Premium), CTA "Empieza gratis 14 días".
  Login/registro inline (sin redirigir a otra página).
- **SEO:** `index.html` — `<title>`, `<meta description>`, JSON-LD `Product`/`Offer` para los 3 planes.

### 3) Dashboard de negocio
- **Archivo:** `src/pages/coach/Dashboard.jsx`
- **Gating:** `hasFeature('businessDashboard')` (Pro y Premium). Muestra pantalla de upgrade si no aplica.
- **Métricas:** nº atletas activos vs límite del plan, nº en gym hoy, adherencia (% activos en últimos 7 días),
  lista de atletas en riesgo (sin actividad reciente).
- **Gráfica:** top 10 atletas por score de disciplina (Recharts `BarChart`).

### 4) Export PDF de progreso
- **Archivo:** `src/lib/exportPdf.js`
- **Gating:** `hasFeature('exportPdf')` (solo Premium). Botón en `AtletaDetalle`.
- **Contenido del PDF:** datos del atleta, gráfica peso/medidas por semana (canvas → base64),
  resumen de adherencia, rango de fechas. Logo del coach en encabezado (si existe).
- **Generación:** jsPDF, cliente-side; no requiere servidor.