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
npm run qa           # corre contra producción (coachpro-livid.vercel.app)
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
| `QA_URL` | `https://coachpro-livid.vercel.app` |
| `QA_COACH_EMAIL` | `coach@coachpro.app` |
| `QA_COACH_PASS` | `CoachPro-2026` |
| `QA_TOKEN` | token del portal de Ana |

## Qué prueba
Arranque (monta React, env vars presentes), login del coach, home con stats y scores,
detalle de atleta, navegación Rutinas/Agenda/Chat, portal del atleta (Score, mini-stats,
rutina del día, Nutrición, Progreso, Chat), token inválido, y ausencia de errores JS.

## Salida
- Reporte **PASS/FAIL** por caso en la terminal (exit code `1` si algo falla → sirve para CI).
- Capturas de cada pantalla en `qa/screenshots/` (las de fallo se prefijan con `FAIL-`).

> El día de la semana afecta la rutina del día (Full Body A está asignada a Lun/Mié/Vie);
> el harness acepta "rutina del día" **o** "Día de descanso".
