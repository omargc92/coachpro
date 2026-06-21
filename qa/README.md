# QA automatizado (Playwright)

Prueba la app desplegada con un **navegador real** (necesario porque CoachPro es una
SPA: el HTML llega vacío y todo lo dibuja JavaScript). Un agente sin navegador "ve"
un documento vacío y reporta falsos cuelgues — este harness evita eso.

## Requisitos
- **Google Chrome** instalado (usa el del sistema, sin descargas). Si no lo tienes,
  el script cae a Chromium de Playwright: `npx playwright install chromium`.

## Uso
```bash
npm install          # instala playwright (dev dependency)
npm run qa           # corre contra producción (coachpro-gray.vercel.app)
```

Contra un preview local:
```bash
npm run build && npm run preview      # en otra terminal (sirve en :4173)
QA_URL=http://localhost:4173 npm run qa
```

> Nota: un preview local **sin `.env`** no tiene credenciales de Supabase, así que el
> login del coach y los datos fallarán a propósito. Para QA de datos, usa producción
> o crea un `.env` con las variables y reconstruye.

## Variables (opcionales, con defaults de la demo)
| Var | Default |
|---|---|
| `QA_URL` | `https://coachpro-gray.vercel.app` |
| `QA_COACH_EMAIL` | `coach@coachpro.app` |
| `QA_COACH_PASS` | (GitHub Secrets — rotada, no va en el repo) |
| `QA_TOKEN` | (GitHub Secrets — token del portal de Ana) |

## Qué prueba

### Arranque
- App responde y carga el documento
- **Landing pública** con sección de precios y CTA "Empieza gratis 14 días"
- Los 3 planes visibles en la landing (Trial, Pro, Premium)
- Env vars de Supabase presentes en el bundle

### Acceso del coach (Fase D — landing)
- "Ya tengo cuenta" despliega el formulario de login
- Botón "Entrar" deshabilitado con formulario vacío
- Login con credenciales válidas entra al panel
- Si hay onboarding activo: se detecta y se salta automáticamente
- **Banner de trial** visible (coach en periodo de prueba)

### Portal del coach — Atletas
- Tarjetas de stats (Atletas / Hoy en gym / En riesgo)
- Lista de atletas con score
- Detalle de atleta: Mediciones, link de portal, estado de **export PDF** (botón Premium o lock)

### Navegación (6 tabs)
- Rutinas → Builder
- Agenda → vista del día
- Chat → lista de conversaciones

### Fase D — Dashboard de negocio
- Tab "Negocio" existe en la barra de navegación
- Carga estadísticas (adherencia, scores) si el plan lo incluye, o pantalla de gating si no

### Fases B/C — Planes y Stripe
- Tabla comparativa con Pro ($299) y Premium ($599)
- Botones "Suscribirse a Pro" y "Suscribirse a Premium" visibles

### Fase A — Branding
- Configuración: sección Marca con uploader de logo visible

### Portal del atleta (token)
- Score de Disciplina carga correctamente
- Mini-stats (Asistencia / Rutina / Comida)
- Rutina del día o "Día de descanso" (según el día de la semana)
- Pestaña Nutrición: anillo de proteína
- Pestaña Progreso: gráfica de peso
- Pestaña Chat: campo de mensaje visible

### Seguridad
- Token inválido muestra "Link inválido"
- Landing no expone datos de coaches sin autenticar

### Consola
- Sin errores JS no controlados durante todo el recorrido

## Salida
- Reporte **PASS/FAIL** por caso en la terminal (exit code `1` si algo falla → sirve para CI).
- Capturas de cada pantalla en `qa/screenshots/` (las de fallo se prefijan con `FAIL-`).

> El día de la semana afecta la rutina del día (Full Body A está asignada a Lun/Mié/Vie);
> el harness acepta "rutina del día" **o** "Día de descanso".

> Los botones de pago de Stripe **no se prueban** en el harness automatizado — requieren
> tarjetas de test en un entorno Stripe configurado. Probarlos manualmente con las
> tarjetas de prueba documentadas en `.env.example`.
