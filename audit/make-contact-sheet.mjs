// ============================================================
// Junta las 26 capturas de la auditoría en UNA sola imagen (contact sheet).
// Arma una grilla HTML y la fotografía con Playwright.
//   Salida: audit/_all-screenshots.png
// ============================================================
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

const SCREENS = [
  ['01', 'login', 'Login (coach)'],
  ['02', 'coach-atletas', 'Atletas (lista)'],
  ['03', 'coach-detalle-nutricion', 'AtletaDetalle · nutrición'],
  ['04', 'sheet-objetivos', 'Sheet Objetivos'],
  ['05', 'coach-rutinas', 'Rutinas'],
  ['06', 'coach-agenda', 'Agenda'],
  ['07', 'coach-chat', 'Chat (coach)'],
  ['08', 'atleta-hoy', 'Hoy (atleta)'],
  ['09', 'atleta-nutricion', 'Nutrición (atleta)'],
  ['10', 'sheet-agregar-comida', 'Sheet Agregar comida'],
  ['11', 'sheet-buscar-alimento', 'Sub-sheet Buscar alimento'],
  ['12', 'atleta-progreso', 'Progreso (atleta)'],
  ['13', 'atleta-chat', 'Chat (atleta)']
]

const card = ([id, name, label]) => `
  <div class="card">
    <div class="label"><b>${id}</b> · ${label}</div>
    <div class="pair">
      <figure><img src="${id}-${name}-390.png"/><figcaption>390px</figcaption></figure>
      <figure><img src="${id}-${name}-360.png"/><figcaption>360px</figcaption></figure>
    </div>
  </div>`

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { background:#0B0B0D; color:#fff; font-family:-apple-system,Segoe UI,Roboto,sans-serif; padding:28px; }
  h1 { font-size:26px; margin-bottom:4px; }
  .sub { color:#8a8a90; font-size:13px; margin-bottom:24px; }
  .grid { display:flex; flex-wrap:wrap; gap:22px; }
  .card { background:#141417; border:0.5px solid #2a2a30; border-radius:14px; padding:14px; width:580px; }
  .label { font-size:14px; color:#D8FF3E; margin-bottom:10px; letter-spacing:.3px; }
  .pair { display:flex; gap:12px; }
  figure { flex:1; }
  img { width:100%; border-radius:8px; display:block; border:0.5px solid #2a2a30; }
  figcaption { text-align:center; color:#8a8a90; font-size:11px; margin-top:6px; }
</style></head><body>
  <h1>CoachPro — Contact sheet de auditoría</h1>
  <div class="sub">13 pantallas × 2 anchos (390px iPhone 17 Pro · 360px Android angosto) · alto 844</div>
  <div class="grid">${SCREENS.map(card).join('')}</div>
</body></html>`

writeFileSync(resolve(HERE, '_contact-sheet.html'), html)

const browser = await chromium.launch()
const page = await browser.newContext({ deviceScaleFactor: 1 }).then((c) => c.newPage())
await page.setViewportSize({ width: 1260, height: 1000 })
await page.goto('file://' + resolve(HERE, '_contact-sheet.html'), { waitUntil: 'networkidle' })
await page.screenshot({ path: resolve(HERE, '_all-screenshots.png'), fullPage: true })
await browser.close()
console.log('Listo → audit/_all-screenshots.png')
