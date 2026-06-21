// ============================================================
// Fase D — Generación de PDF de progreso del atleta.
// Gating: solo Premium (hasFeature('exportPdf')).
// ============================================================
import { jsPDF } from 'jspdf'

const OBJETIVO_LABEL = {
  perdida_grasa: 'Pérdida de grasa',
  hipertrofia:   'Hipertrofia',
  recomposicion: 'Recomposición',
  mantenimiento: 'Mantenimiento'
}

async function urlToBase64(url) {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

function semanasDesdeFecha(fechaISO) {
  const ms = Date.now() - new Date(fechaISO + 'T00:00:00').getTime()
  return Math.max(1, Math.floor(ms / (7 * 86_400_000)) + 1)
}

function fechaCorta(f) {
  const [, m, d] = f.split('-')
  return `${d}/${m}`
}

export async function exportarProgresoPDF({ atleta, mediciones = [], actividad = null, coach = null }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()   // 210
  const H   = doc.internal.pageSize.getHeight()  // 297
  const PAD = 15

  // ── Paleta ────────────────────────────────────────────────
  const ACCENT  = [216, 255, 62]
  const INK     = [11,  11,  13]
  const TITLE   = [255, 255, 255]
  const BODY    = [237, 237, 239]
  const MUTED   = [154, 156, 162]
  const SURFACE = [15,  15,  17]
  const BG      = [11,  11,  13]

  // ── Fondo ─────────────────────────────────────────────────
  doc.setFillColor(...BG)
  doc.rect(0, 0, W, H, 'F')

  let y = 0

  // ── Header bar ────────────────────────────────────────────
  doc.setFillColor(...ACCENT)
  doc.rect(0, 0, W, 16, 'F')

  // Logo del coach (si existe)
  let logoOk = false
  if (coach?.logo_url) {
    try {
      const b64 = await urlToBase64(coach.logo_url)
      const ext = coach.logo_url.split('.').pop()?.split('?')[0]?.toLowerCase() || 'png'
      const fmt = ext === 'jpg' || ext === 'jpeg' ? 'JPEG' : 'PNG'
      doc.addImage(b64, fmt, PAD, 2, 0, 12)
      logoOk = true
    } catch { /* fallback */ }
  }
  if (!logoOk) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text('CoachPro', PAD, 11)
  }

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text(`Generado ${new Date().toLocaleDateString('es-MX')}`, W - PAD, 10, { align: 'right' })

  y = 26

  // ── Título ────────────────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TITLE)
  doc.text('Reporte de Progreso', PAD, y)
  y += 7

  // ── Datos del atleta ──────────────────────────────────────
  doc.setFontSize(14)
  doc.setTextColor(...BODY)
  doc.text(atleta.nombre, PAD, y)
  y += 6

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  const obj = OBJETIVO_LABEL[atleta.objetivo] || atleta.objetivo
  const semanas = semanasDesdeFecha(atleta.fecha_inicio)
  doc.text(`${obj}  ·  Semana ${semanas}`, PAD, y)
  y += 10

  // ── Separador ─────────────────────────────────────────────
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.4)
  doc.line(PAD, y, W - PAD, y)
  y += 8

  // ── MEDICIONES ────────────────────────────────────────────
  if (mediciones.length) {
    const ultima  = mediciones[mediciones.length - 1]
    const primera = mediciones[0]
    const delta   = (Number(ultima.peso_kg) - Number(primera.peso_kg)).toFixed(1)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MUTED)
    doc.setCharSpace(1.5)
    doc.text('MEDICIONES', PAD, y)
    doc.setCharSpace(0)
    y += 6

    const stats = [
      { label: 'Peso actual', v: `${Number(ultima.peso_kg)} kg` },
      { label: 'Cambio',      v: `${delta > 0 ? '+' : ''}${delta} kg` },
      ...(ultima.grasa_pct  != null ? [{ label: 'Grasa',   v: `${Number(ultima.grasa_pct)}%` }]   : []),
      ...(ultima.cintura_cm != null ? [{ label: 'Cintura', v: `${Number(ultima.cintura_cm)} cm` }] : [])
    ].slice(0, 4)

    const colW = (W - 2 * PAD) / stats.length
    stats.forEach(({ label, v }, i) => {
      const x = PAD + i * colW
      doc.setFillColor(...SURFACE)
      doc.roundedRect(x, y, colW - 3, 20, 3, 3, 'F')
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...ACCENT)
      doc.text(v, x + (colW - 3) / 2, y + 11, { align: 'center' })
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      doc.text(label, x + (colW - 3) / 2, y + 17, { align: 'center' })
    })
    y += 26

    // Sparkline de peso
    if (mediciones.length > 1) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...MUTED)
      doc.setCharSpace(1.5)
      doc.text('EVOLUCIÓN DE PESO', PAD, y)
      doc.setCharSpace(0)
      y += 5

      const chartW = W - 2 * PAD
      const chartH = 30
      const xs = PAD, ys = y

      const pesos = mediciones.map(m => Number(m.peso_kg))
      const minP  = Math.min(...pesos) - 0.5
      const maxP  = Math.max(...pesos) + 0.5
      const range = maxP - minP || 1

      doc.setFillColor(...SURFACE)
      doc.roundedRect(xs, ys, chartW, chartH, 2, 2, 'F')

      const pts = pesos.map((p, i) => ({
        x: xs + (i / (pesos.length - 1)) * chartW,
        y: ys + chartH - ((p - minP) / range) * chartH * 0.85 - chartH * 0.075
      }))

      // Relleno del área bajo la curva
      doc.setFillColor(216, 255, 62, 0.15)
      const fillPath = [[pts[0].x, ys + chartH], ...pts.map(p => [p.x, p.y]), [pts[pts.length - 1].x, ys + chartH]]
      doc.setFillColor(40, 50, 10)
      // jspdf no soporta fill path directamente; usamos líneas de color
      doc.setDrawColor(216, 255, 62)
      doc.setLineWidth(1.2)
      for (let i = 1; i < pts.length; i++) {
        doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y)
      }

      // Puntos
      doc.setFillColor(...ACCENT)
      pts.forEach(p => doc.circle(p.x, p.y, 1.2, 'F'))

      // Etiquetas de fecha (inicio y fin)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...MUTED)
      doc.text(fechaCorta(mediciones[0].fecha),                         xs + 1,      ys + chartH - 1)
      doc.text(fechaCorta(mediciones[mediciones.length - 1].fecha), W - PAD - 1, ys + chartH - 1, { align: 'right' })

      y += chartH + 6
    }
  }

  // ── ADHERENCIA ────────────────────────────────────────────
  const asistencias = actividad?.asistencias?.slice(-30) || []
  if (asistencias.length) {
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.3)
    doc.line(PAD, y, W - PAD, y)
    y += 7

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...MUTED)
    doc.setCharSpace(1.5)
    doc.text('ADHERENCIA', PAD, y)
    doc.setCharSpace(0)
    y += 6

    const presentes = asistencias.filter(a => a.presente).length
    const pct = Math.round((presentes / asistencias.length) * 100)

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...ACCENT)
    doc.text(`${pct}%`, PAD, y + 12)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...BODY)
    doc.text(`${presentes} de ${asistencias.length} sesiones`, PAD, y + 19)

    // Puntos de asistencia (mini-calendario)
    const dotSz  = 4
    const dotGap = 1.5
    const perRow = 15
    let dx = PAD + 50, dy = y + 2
    asistencias.forEach((a, i) => {
      if (i > 0 && i % perRow === 0) { dx = PAD + 50; dy += dotSz + dotGap + 1 }
      if (a.presente) doc.setFillColor(...ACCENT)
      else            doc.setFillColor(40, 42, 46)
      doc.roundedRect(dx, dy, dotSz, dotSz, 1, 1, 'F')
      dx += dotSz + dotGap
    })
    y += 30
  }

  // ── Footer ────────────────────────────────────────────────
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MUTED)
  doc.text('CoachPro — Plataforma de coaching fitness', W / 2, H - 8, { align: 'center' })

  // ── Guardar ───────────────────────────────────────────────
  const nombre = atleta.nombre.toLowerCase().replace(/\s+/g, '-')
  doc.save(`progreso-${nombre}.pdf`)
}
