// ============================================================
// Auditoría visual + responsividad de CoachPro (solo observa/mide).
// Captura cada pantalla a 390px y 360px (alto 844) y mide 7 puntos.
// Salida: audit/*.png  +  audit/measures.json
// ============================================================
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const URL = (process.env.AUDIT_URL || 'http://localhost:5173').replace(/\/$/, '')
const EMAIL = process.env.QA_COACH_EMAIL || 'coach@coachpro.app'
const PASS = process.env.QA_COACH_PASS || 'CoachPro-2026'
const TOKEN = process.env.QA_TOKEN || 'ed866fae-d554-44b6-a98b-0df2c329e307'
const WIDTHS = [390, 360]
const H = 844

mkdirSync(HERE, { recursive: true })

// --- mide los 7 puntos en el estado actual de la página ---
const MEASURE = () => {
  const de = document.documentElement
  const clientWidth = de.clientWidth
  const scrollWidth = de.scrollWidth
  const horizontalOverflow = scrollWidth > clientWidth + 0.5

  // elemento que más se desborda a la derecha
  let widest = null
  if (horizontalOverflow) {
    let maxRight = clientWidth
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.right > maxRight + 0.5) {
        maxRight = r.right
        widest = el
      }
    }
  }
  const describe = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return {
      tag: el.tagName.toLowerCase(),
      text: txt,
      width: Math.round(r.width),
      scrollWidth: el.scrollWidth,
      right: Math.round(r.right),
      overflowBy: Math.round(r.right - clientWidth)
    }
  }

  // BottomNav
  const nav = document.querySelector('nav')
  let navInfo = { present: false }
  if (nav) {
    const nr = nav.getBoundingClientRect()
    const btns = [...nav.querySelectorAll('button')].map((b) => {
      const r = b.getBoundingClientRect()
      const label = (b.textContent || '').trim()
      const color = getComputedStyle(b).color
      return { w: Math.round(r.width), h: Math.round(r.height), label, color }
    })
    navInfo = {
      present: true,
      top: Math.round(nr.top),
      height: Math.round(nr.height),
      bg: getComputedStyle(nav).backgroundColor,
      buttons: btns,
      allButtons44: btns.every((b) => b.w >= 44 && b.h >= 44)
    }
  }

  // Header (div que contiene el primer h1)
  const h1 = document.querySelector('h1')
  let headerInfo = { present: false }
  if (h1) {
    const hd = h1.closest('div')
    const r = hd.getBoundingClientRect()
    const cs = getComputedStyle(hd)
    headerInfo = {
      present: true,
      top: Math.round(r.top),
      height: Math.round(r.height),
      bg: cs.backgroundColor,
      paddingTop: cs.paddingTop,
      title: (h1.textContent || '').trim().slice(0, 30)
    }
  }

  // Botón de acción final (último botón visible de un sheet, o el primario más abajo)
  const actionLabels = ['Guardar comida', 'Usar', 'Guardar objetivos', 'Guardar', 'Entrar', 'Agregar', 'Asignar']
  let action = null
  for (const el of document.querySelectorAll('button')) {
    const t = (el.textContent || '').trim()
    if (actionLabels.some((l) => t === l || t.startsWith(l))) {
      const r = el.getBoundingClientRect()
      if (r.width === 0) continue
      const visible = r.top >= 0 && r.bottom <= window.innerHeight + 0.5
      action = { label: t, w: Math.round(r.width), h: Math.round(r.height), ok44: r.width >= 44 && r.height >= 44, visibleInViewport: visible, top: Math.round(r.top), bottom: Math.round(r.bottom) }
    }
  }

  // Contenido tapado por nav: ¿algún elemento de contenido cae bajo el top del nav?
  let contentUnderNav = null
  if (nav) {
    const navTop = nav.getBoundingClientRect().top
    // raíz scrolleable = primer div hijo de body
    const root = document.querySelector('#root > div')
    const cs = root ? getComputedStyle(root) : null
    contentUnderNav = {
      navTop: Math.round(navTop),
      rootPaddingBottom: cs ? cs.paddingBottom : null,
      docScrollHeight: de.scrollHeight,
      viewportH: window.innerHeight
    }
  }

  return {
    clientWidth,
    scrollWidth,
    horizontalOverflow,
    widestOverflower: describe(widest),
    nav: navInfo,
    header: headerInfo,
    action,
    contentUnderNav
  }
}

async function main() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: H }, deviceScaleFactor: 2 })
  const errors = []
  ctx.on('weberror', (e) => errors.push(String(e.error())))

  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))

  const shots = [] // { idx, name, measures: {390, 360} }

  // captura el estado actual a ambos anchos
  async function snap(idx, name, { scrollY = 0 } = {}) {
    const id = String(idx).padStart(2, '0')
    const m = {}
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: H })
      await page.waitForTimeout(450)
      if (scrollY) await page.evaluate((y) => window.scrollTo(0, y), scrollY)
      await page.waitForTimeout(150)
      await page.screenshot({ path: resolve(HERE, `${id}-${name}-${w}.png`) })
      m[w] = await page.evaluate(MEASURE)
    }
    // vuelve a 390 para seguir el flujo
    await page.setViewportSize({ width: WIDTHS[0], height: H })
    await page.waitForTimeout(200)
    shots.push({ idx, name, measures: m })
    console.log(`  ✓ ${id} ${name}`)
  }

  const txt = (t, exact = false) => page.getByText(t, { exact }).first()
  const waitTxt = (t, exact = false, timeout = 15000) => txt(t, exact).waitFor({ state: 'visible', timeout })

  console.log('Auditoría — coach')
  await page.goto(`${URL}/?audit=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 25000 })
  await waitTxt('Panel del entrenador')
  await snap(1, 'login')

  await page.fill('input[type=email]', EMAIL)
  await page.fill('input[type=password]', PASS)
  await page.getByRole('button', { name: /Entrar/ }).click()
  await page.getByText('Hoy en gym').first().waitFor({ state: 'visible', timeout: 20000 })
  await page.waitForTimeout(1500)
  await snap(2, 'coach-atletas')

  // Detalle de Ana
  await txt('· Semana').click()
  await waitTxt('Adherencia nutricional')
  await page.waitForTimeout(1200)
  // scroll hasta la sección de nutrición para que se vea "Editar metas"
  const yNut = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => e.textContent?.trim().startsWith('Adherencia nutricional'))
    return el ? window.scrollY + el.getBoundingClientRect().top - 60 : 0
  })
  await snap(3, 'coach-detalle-nutricion', { scrollY: yNut })

  // Sheet objetivos
  await page.getByText(/Editar metas|Definir metas/).first().click()
  await waitTxt('Objetivos de nutrición')
  await page.waitForTimeout(600)
  await snap(4, 'sheet-objetivos')
  // cerrar sheet (botón x del header del sheet o Escape)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // volver a Atletas
  await page.getByRole('button').first().click().catch(() => {})
  await page.locator('nav').getByText('Atletas', { exact: true }).waitFor({ state: 'visible', timeout: 10000 })

  await page.locator('nav').getByText('Rutinas', { exact: true }).click()
  await waitTxt('Builder')
  await page.waitForTimeout(1000)
  await snap(5, 'coach-rutinas')

  await page.locator('nav').getByText('Agenda', { exact: true }).click()
  await waitTxt('Hoy ·')
  await page.waitForTimeout(1000)
  await snap(6, 'coach-agenda')

  await page.locator('nav').getByText('Chat', { exact: true }).click()
  await waitTxt('Conversaciones')
  await page.waitForTimeout(1000)
  await snap(7, 'coach-chat')

  console.log('Auditoría — atleta')
  const ap = await ctx.newPage()
  ap.on('pageerror', (e) => errors.push(String(e)))
  // reusar snap con la página del atleta: cambio temporal de referencia
  const coachPage = page
  // pequeña función local para el atleta
  async function snapAp(idx, name) {
    const id = String(idx).padStart(2, '0')
    const m = {}
    for (const w of WIDTHS) {
      await ap.setViewportSize({ width: w, height: H })
      await ap.waitForTimeout(450)
      await ap.screenshot({ path: resolve(HERE, `${id}-${name}-${w}.png`) })
      m[w] = await ap.evaluate(MEASURE)
    }
    await ap.setViewportSize({ width: WIDTHS[0], height: H })
    await ap.waitForTimeout(200)
    shots.push({ idx, name, measures: m })
    console.log(`  ✓ ${id} ${name}`)
  }
  const apTxt = (t, exact = false) => ap.getByText(t, { exact }).first()
  const apTab = (t) => ap.locator('nav').getByText(t, { exact: true })

  await ap.goto(`${URL}/?token=${TOKEN}`, { waitUntil: 'domcontentloaded', timeout: 25000 })
  await apTxt('Score de disciplina').waitFor({ state: 'visible', timeout: 20000 })
  await ap.waitForTimeout(1500)
  await snapAp(8, 'atleta-hoy')

  await apTab('Nutrición').click()
  await apTxt('Proteína de hoy').waitFor({ state: 'visible', timeout: 12000 })
  await ap.waitForTimeout(1200)
  await snapAp(9, 'atleta-nutricion')

  // Sheet agregar comida
  await apTxt('Agregar').click()
  await apTxt('Agregar comida').waitFor({ state: 'visible', timeout: 8000 })
  await ap.waitForTimeout(500)
  await snapAp(10, 'sheet-agregar-comida')

  // Sub-sheet buscar alimento
  await apTxt('Buscar alimento').click()
  await ap.getByPlaceholder('Ej. yogur griego').waitFor({ state: 'visible', timeout: 8000 })
  await ap.getByPlaceholder('Ej. yogur griego').fill('yogur griego')
  await ap.getByRole('button', { name: /Buscar/ }).first().click()
  // esperar resultados (alguna card con "/ 100 g")
  await ap.getByText('/ 100 g').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  await ap.waitForTimeout(800)
  await snapAp(11, 'sheet-buscar-alimento')
  await ap.keyboard.press('Escape')
  await ap.waitForTimeout(400)

  await apTab('Progreso').click()
  await apTxt('Tu progreso').waitFor({ state: 'visible', timeout: 12000 })
  await ap.waitForTimeout(1500)
  await snapAp(12, 'atleta-progreso')

  await apTab('Chat').click()
  await ap.getByPlaceholder('Mensaje…').waitFor({ state: 'visible', timeout: 10000 })
  await ap.waitForTimeout(800)
  await snapAp(13, 'atleta-chat')

  await browser.close()
  writeFileSync(resolve(HERE, 'measures.json'), JSON.stringify({ url: URL, widths: WIDTHS, height: H, errors, shots }, null, 2))
  console.log(`\nListo. ${shots.length} pantallas × ${WIDTHS.length} anchos. Errores JS: ${errors.length}`)
}

main().catch((e) => {
  console.error('Error en la auditoría:', e)
  process.exit(1)
})
