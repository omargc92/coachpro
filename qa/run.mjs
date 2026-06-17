// ============================================================
// CoachPro — QA automatizado (Playwright)
// Ejecuta un navegador REAL (Chrome del sistema), prueba el portal del
// coach y el del atleta, captura pantallas y emite un reporte PASS/FAIL.
//
//   npm run qa                # contra producción
//   QA_URL=http://localhost:4173 npm run qa   # contra un preview local
//
// Variables (con defaults de la demo):
//   QA_URL, QA_COACH_EMAIL, QA_COACH_PASS, QA_TOKEN
// ============================================================
import { chromium } from 'playwright'
import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SHOTS = resolve(HERE, 'screenshots')

const CFG = {
  url: (process.env.QA_URL || 'https://coachpro-livid.vercel.app').replace(/\/$/, ''),
  email: process.env.QA_COACH_EMAIL || 'coach@coachpro.app',
  pass: process.env.QA_COACH_PASS || 'CoachPro-2026',
  token: process.env.QA_TOKEN || 'ed866fae-d554-44b6-a98b-0df2c329e307'
}

// ---------- estado del reporte ----------
const results = []
const consoleErrors = []
let currentPage = null

const C = { ok: '\x1b[32m', no: '\x1b[31m', dim: '\x1b[90m', b: '\x1b[1m', x: '\x1b[0m', y: '\x1b[33m' }

async function check(name, fn) {
  try {
    await fn()
    results.push({ name, pass: true })
    console.log(`  ${C.ok}✓${C.x} ${name}`)
  } catch (err) {
    results.push({ name, pass: false, error: err.message })
    console.log(`  ${C.no}✗ ${name}${C.x}\n    ${C.dim}${err.message.split('\n')[0]}${C.x}`)
    if (currentPage) await shot(currentPage, `FAIL-${slug(name)}`).catch(() => {})
  }
}

async function shot(page, name) {
  await page.screenshot({ path: resolve(SHOTS, `${name}.png`) })
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)

// localizador por texto, visible, con timeout
function vis(page, text, opts = {}) {
  return page.getByText(text, { exact: opts.exact ?? false }).first()
}
async function expectVisible(page, text, timeout = 12000) {
  await vis(page, text).waitFor({ state: 'visible', timeout })
}

// ============================================================
async function main() {
  rmSync(SHOTS, { recursive: true, force: true })
  mkdirSync(SHOTS, { recursive: true })

  console.log(`\n${C.b}CoachPro · QA automatizado${C.x}`)
  console.log(`${C.dim}URL: ${CFG.url}${C.x}\n`)

  // En CI usa el Chromium de Playwright (QA_BROWSER=chromium); en local, el Chrome del sistema.
  const preferChromium = process.env.QA_BROWSER === 'chromium'
  let browser
  try {
    browser = preferChromium ? await chromium.launch() : await chromium.launch({ channel: 'chrome' })
  } catch {
    console.log(`${C.y}Navegador primario no disponible; probando alternativa…${C.x}`)
    try {
      browser = preferChromium ? await chromium.launch({ channel: 'chrome' }) : await chromium.launch()
    } catch (e) {
      console.log(`${C.no}No se pudo lanzar navegador.${C.x} Instala Chrome o corre: npx playwright install chromium\n${e.message}`)
      process.exit(2)
    }
  }

  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })
  ctx.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  ctx.on('weberror', (e) => consoleErrors.push(String(e.error())))

  // ---------------- ARRANQUE ----------------
  const boot = []
  const page = await ctx.newPage()
  currentPage = page
  page.on('console', (m) => boot.push(m.text()))
  page.on('pageerror', (e) => consoleErrors.push(String(e)))

  console.log(`${C.b}Arranque${C.x}`)
  await check('La app responde y carga el documento', async () => {
    const resp = await page.goto(`${CFG.url}/?qa=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp?.status()}`)
  })
  await check('React monta y muestra el login (no se queda en loading)', async () => {
    await expectVisible(page, 'Panel del entrenador')
  })
  await check('Env vars de Supabase presentes en el bundle (log de arranque)', async () => {
    await page.waitForTimeout(800)
    const line = boot.find((l) => l.includes('supabase env ok'))
    if (!line) throw new Error('no apareció el log de arranque')
    if (!/true true/.test(line)) throw new Error(`env no presentes: "${line}"`)
  })
  await shot(page, '01-login')

  // ---------------- COACH ----------------
  console.log(`\n${C.b}Portal del coach${C.x}`)
  await check('Botón "Entrar" deshabilitado con el formulario vacío', async () => {
    const b = page.getByRole('button', { name: /Entrar/ })
    if (!(await b.isDisabled())) throw new Error('debería estar deshabilitado')
  })
  await check('Login con credenciales válidas entra al panel', async () => {
    await page.fill('input[type=email]', CFG.email)
    await page.fill('input[type=password]', CFG.pass)
    await page.getByRole('button', { name: /Entrar/ }).click()
    await vis(page, 'Atletas', { exact: true }).waitFor({ state: 'visible', timeout: 15000 })
  })
  await check('Home muestra tarjetas de stats (Atletas / Hoy en gym / En riesgo)', async () => {
    await expectVisible(page, 'Hoy en gym')
    await expectVisible(page, 'En riesgo')
  })
  await check('Lista de atletas con score (aparece "Score")', async () => {
    await expectVisible(page, 'Score')
  })
  await page.waitForTimeout(1200)
  await shot(page, '02-coach-atletas')

  await check('Abrir detalle de un atleta muestra Mediciones + link de portal', async () => {
    // toca la primera tarjeta de atleta de la lista
    await page.getByText(/· Semana/).first().click()
    await expectVisible(page, 'Copiar link del portal')
    await expectVisible(page, 'Mediciones')
  })
  await page.waitForTimeout(1500)
  await shot(page, '03-coach-detalle')

  await check('Volver y navegar a Rutinas / Agenda / Chat', async () => {
    // botón atrás del header
    await page.getByRole('button').first().click().catch(() => {})
    await vis(page, 'Atletas', { exact: true }).waitFor({ state: 'visible', timeout: 8000 })
    await page.getByText('Rutinas', { exact: true }).click()
    await expectVisible(page, 'Builder')
    await page.getByText('Agenda', { exact: true }).click()
    await expectVisible(page, 'Hoy ·')
    await page.getByText('Chat', { exact: true }).click()
    await expectVisible(page, 'Conversaciones')
  })
  await shot(page, '04-coach-nav')

  // ---------------- ATLETA ----------------
  console.log(`\n${C.b}Portal del atleta (token)${C.x}`)
  const ap = await ctx.newPage()
  currentPage = ap
  ap.on('pageerror', (e) => consoleErrors.push(String(e)))

  await check('Portal del atleta carga el Score de Disciplina', async () => {
    await ap.goto(`${CFG.url}/?token=${CFG.token}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await expectVisible(ap, 'Score de disciplina')
  })
  await check('Mini-stats presentes (Asistencia / Rutina / Comida)', async () => {
    await expectVisible(ap, 'Asistencia')
    await expectVisible(ap, 'Rutina')
    await expectVisible(ap, 'Comida')
  })
  await check('Muestra rutina del día o "Día de descanso" (según el día)', async () => {
    const rutina = ap.getByText(/Rutina ·/).first()
    const descanso = ap.getByText('Día de descanso').first()
    await Promise.race([
      rutina.waitFor({ state: 'visible', timeout: 8000 }),
      descanso.waitFor({ state: 'visible', timeout: 8000 })
    ])
  })
  await ap.waitForTimeout(1500)
  await shot(ap, '05-atleta-hoy')

  await check('Pestaña Nutrición: anillo de proteína + sugerencia', async () => {
    await ap.getByText('Nutrición', { exact: true }).click()
    await expectVisible(ap, 'Proteína de hoy')
  })
  await ap.waitForTimeout(1200)
  await shot(ap, '06-atleta-nutricion')

  await check('Pestaña Progreso: selector de métrica + gráfica', async () => {
    await ap.getByText('Progreso', { exact: true }).click()
    await expectVisible(ap, 'Tu progreso')
  })
  await ap.waitForTimeout(1500)
  await shot(ap, '07-atleta-progreso')

  await check('Pestaña Chat: hilo con el coach', async () => {
    await ap.getByText('Chat', { exact: true }).click()
    await ap.getByPlaceholder('Mensaje…').waitFor({ state: 'visible', timeout: 8000 })
  })
  await shot(ap, '08-atleta-chat')

  // ---------------- SEGURIDAD ----------------
  console.log(`\n${C.b}Seguridad${C.x}`)
  await check('Token inválido muestra "Link inválido"', async () => {
    const bad = await ctx.newPage()
    currentPage = bad
    await bad.goto(`${CFG.url}/?token=00000000-0000-0000-0000-000000000000`, { waitUntil: 'domcontentloaded' })
    await expectVisible(bad, 'Link inválido', 12000)
    await bad.close()
  })

  // ---------------- CONSOLA ----------------
  console.log(`\n${C.b}Consola${C.x}`)
  currentPage = null
  await check('Sin errores JS no controlados durante el recorrido', async () => {
    const real = consoleErrors.filter(
      (e) => !/ServiceWorker|autocomplete|favicon|Failed to load resource/i.test(e)
    )
    if (real.length) throw new Error(`${real.length} error(es): ${real.slice(0, 3).join(' | ')}`)
  })

  await browser.close()

  // ---------------- REPORTE ----------------
  const pass = results.filter((r) => r.pass).length
  const fail = results.length - pass
  console.log(`\n${C.b}Resultado${C.x}`)
  console.log(`  ${C.ok}${pass} PASS${C.x} · ${fail ? C.no : C.dim}${fail} FAIL${C.x}  (de ${results.length})`)
  console.log(`  ${C.dim}Capturas en qa/screenshots/${C.x}`)
  if (fail) {
    console.log(`\n  ${C.no}Fallos:${C.x}`)
    for (const r of results.filter((r) => !r.pass)) console.log(`   - ${r.name}: ${r.error}`)
  }
  console.log('')
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error(`\n${C.no}Error fatal del harness:${C.x}`, e)
  process.exit(2)
})
