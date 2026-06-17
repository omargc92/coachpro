// ============================================================
// Score de Disciplina (0–100) — feature estrella
// Promedio ponderado de Asistencia (40%), Rutina (35%), Nutrición (25%).
// Se calcula en el cliente a partir de lo registrado en la app.
// NO usa datos de wearables.
// ============================================================
import { SCORE_STREAK_UMBRAL } from './theme.js'

const PESOS = { asistencia: 0.4, rutina: 0.35, nutricion: 0.25 }

// --- Sub-scores (cada uno 0..100) ---

// Asistencia: 100 si registró asistencia o una sesión hoy.
export function scoreAsistencia({ asistioHoy }) {
  return asistioHoy ? 100 : 0
}

// Rutina: % de sets completados respecto a los planeados del día.
// planeados = suma de series de la rutina asignada; hechos = sets completados hoy.
export function scoreRutina({ setsPlaneados, setsHechos }) {
  if (!setsPlaneados || setsPlaneados <= 0) return 100 // sin rutina hoy → no penaliza
  return clamp((setsHechos / setsPlaneados) * 100)
}

// Nutrición: cercanía a los macros. Penaliza desvío de proteína y kcal.
// Si no hay objetivo o aún no registra comidas, no penaliza (devuelve null → se omite).
export function scoreNutricion({ objetivo, consumido }) {
  if (!objetivo || !consumido) return null
  const kcalMeta = objetivo.kcal || 0
  const protMeta = objetivo.proteina_g || 0
  if (kcalMeta <= 0 && protMeta <= 0) return null

  // desvío relativo (0 = perfecto). Proteína pesa más que kcal.
  const devKcal = kcalMeta ? Math.abs((consumido.kcal || 0) - kcalMeta) / kcalMeta : 0
  const devProt = protMeta ? Math.abs((consumido.proteina_g || 0) - protMeta) / protMeta : 0
  const penal = devProt * 0.6 + devKcal * 0.4 // 0..(grande)
  return clamp((1 - penal) * 100)
}

// --- Score total del día ---
// Devuelve { total, asistencia, rutina, nutricion } (nutricion puede ser null).
export function scoreDia(input) {
  const asistencia = scoreAsistencia(input)
  const rutina = scoreRutina(input)
  const nutricion = scoreNutricion(input)

  // Si no hay datos de nutrición, redistribuimos su peso entre los otros dos.
  let pesos = { ...PESOS }
  if (nutricion === null) {
    const extra = pesos.nutricion
    pesos = {
      asistencia: pesos.asistencia + extra * (PESOS.asistencia / (PESOS.asistencia + PESOS.rutina)),
      rutina: pesos.rutina + extra * (PESOS.rutina / (PESOS.asistencia + PESOS.rutina)),
      nutricion: 0
    }
  }

  const total =
    asistencia * pesos.asistencia +
    rutina * pesos.rutina +
    (nutricion ?? 0) * pesos.nutricion

  return {
    total: Math.round(clamp(total)),
    asistencia: Math.round(asistencia),
    rutina: Math.round(rutina),
    nutricion: nutricion === null ? null : Math.round(nutricion)
  }
}

// --- Racha: días consecutivos (terminando hoy/ayer) con score >= umbral ---
// scoresPorFecha: Map o objeto { 'YYYY-MM-DD': score }
export function calcularRacha(scoresPorFecha, hoy, umbral = SCORE_STREAK_UMBRAL) {
  const get = (k) => (scoresPorFecha instanceof Map ? scoresPorFecha.get(k) : scoresPorFecha[k])
  let racha = 0
  const d = new Date(hoy + 'T00:00:00')
  // Permite que la racha siga viva si hoy aún no se registra pero ayer sí.
  if ((get(fmt(d)) ?? -1) < umbral) d.setDate(d.getDate() - 1)
  while ((get(fmt(d)) ?? -1) >= umbral) {
    racha++
    d.setDate(d.getDate() - 1)
  }
  return racha
}

// --- helpers ---
function clamp(n) {
  return Math.max(0, Math.min(100, n))
}
function fmt(d) {
  return d.toISOString().slice(0, 10)
}
