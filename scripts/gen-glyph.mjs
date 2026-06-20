// ============================================================
// Genera los iconos PWA a partir de un GLIFO vectorial (no de la foto).
// Glifo: arco "C" en lima sobre charcoal — eco del anillo de Score, legible
// en tamaños chicos. Render SVG→PNG con Playwright (no hay rsvg/inkscape).
//
//   node scripts/gen-glyph.mjs
// ============================================================
import { chromium } from 'playwright'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHARCOAL = '#0B0B0D'
const LIME = '#D8FF3E'

// Arco "C" abierto a la derecha, centrado en (256,256) de un lienzo 512.
function arcoC(r, startDeg, endDeg) {
  const pt = (deg) => {
    const a = (deg * Math.PI) / 180
    return [256 + r * Math.cos(a), 256 + r * Math.sin(a)]
  }
  const [x1, y1] = pt(startDeg)
  const [x2, y2] = pt(endDeg)
  const large = ((endDeg - startDeg) % 360 + 360) % 360 > 180 ? 1 : 0
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

// maskable=true → arco más chico dentro de la safe-zone (~80% central).
function svg(maskable) {
  const r = maskable ? 118 : 152
  const w = maskable ? 46 : 58
  // C: visible de 55° (abajo-derecha) en sentido horario hasta 305° (arriba-derecha);
  // el hueco (~110°) queda centrado a la derecha.
  const d = arcoC(r, 55, 305)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="${CHARCOAL}"/>
    <path d="${d}" fill="none" stroke="${LIME}" stroke-width="${w}" stroke-linecap="round"/>
  </svg>`
}

const TARGETS = [
  { file: 'public/icons/icon-192.png', size: 192, maskable: false },
  { file: 'public/icons/icon-512.png', size: 512, maskable: false },
  { file: 'public/icons/icon-512-maskable.png', size: 512, maskable: true },
  { file: 'public/apple-touch-icon.png', size: 180, maskable: false }
]

const browser = await chromium.launch()
const page = await browser.newContext({ deviceScaleFactor: 1 }).then((c) => c.newPage())
for (const t of TARGETS) {
  const markup = svg(t.maskable)
  const html = `<!doctype html><html><head><style>*{margin:0;padding:0}svg{display:block}</style></head>
    <body>${markup.replace('width="512" height="512"', `width="${t.size}" height="${t.size}"`)}</body></html>`
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.locator('svg').screenshot({ path: resolve(ROOT, t.file), omitBackground: false })
  console.log('✓', t.file, `(${t.size}px${t.maskable ? ', maskable' : ''})`)
}
await browser.close()
console.log('Glifo generado.')
