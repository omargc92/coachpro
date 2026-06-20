Fase D — Mejoras de activación y retención

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