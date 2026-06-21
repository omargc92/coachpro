Fase A — Branding por coach (logo propio + colores white-label)

Contexto: CoachPro, React 18 + Vite + Supabase + Vercel, inline styles (no Tailwind). Design system base: charcoal #0B0B0D, electric lime, alert orange. Multi-tenant: cada coach es un tenant. Quiero que cada coach pueda subir su propio logo y (en plan Premium, luego) personalizar colores. Esta fase NO incluye el gating por plan todavía — solo la capacidad técnica de branding. El gating se conecta en la Fase B.

1) Supabase:
- Crea bucket "coach-logos" (público de lectura) con RLS: cada coach solo puede subir/borrar su propio logo (path = {coach_id}/logo.{ext}).
- En la tabla de coaches/perfil, agrega columnas: logo_url (text, nullable), brand_primary (text, nullable, hex), brand_accent (text, nullable, hex). Si no existe tabla de perfil de coach, créala ligada a auth.users.

2) UI — Configuración del coach:
- En la pantalla de Configuración/Perfil del coach, agrega una sección "Marca":
  - Uploader de logo (acepta png/jpg/svg, máx 1MB, preview, validación de tamaño/tipo). Sube al bucket, guarda logo_url.
  - Dos color pickers: color primario y color de acento, con preview en vivo. Guarda brand_primary/brand_accent. Si están vacíos, usa los defaults del design system.
  - Botón "Restaurar marca por defecto".

3) Aplicación del branding:
- En el PORTAL DEL ATLETA: muestra el logo del coach (si existe) en el header en vez de/junto al nombre "CoachPro". Aplica brand_primary/brand_accent como acentos del portal SI están definidos; si no, usa electric lime por defecto.
- Crea un contexto/hook (ej. useBranding) que resuelva el branding del coach dueño de ese portal y lo provea a los componentes. Maneja el caso de carga (skeleton) y el fallback a defaults.
- En el panel del coach, muestra su logo en el Header como confirmación visual.

4) Reglas:
- Inline styles, sin Tailwind. No rompas la responsividad ni las safe-areas ya validadas.
- Si el logo es SVG, sanitízalo o restríngelo a <img src> (no inline) para evitar inyección.
- Optimiza: no recargues el logo en cada render; cachéalo vía TanStack Query.

Entregable: documenta columnas/bucket creados, archivos tocados, y cómo probar (subir logo como coach demo → abrir portal de atleta y ver el branding aplicado). Build + deploy a Vercel.