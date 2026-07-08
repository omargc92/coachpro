// ============================================================
// CoachPro — tokens de diseño (única fuente de verdad)
// Estética "disciplina, no decoración". Mobile-first, un solo acento.
// ============================================================

export const colors = {
  // Fondo y superficies
  bg: '#0B0B0D',
  surface: '#0F0F11',
  surface2: '#16171A',
  border: '#1E1F23',

  // Acento único de alto voltaje. Resuelve a la variable de marca del coach
  // (BrandingProvider setea --cp-primary); el lima es el fallback por defecto.
  accent: 'var(--cp-primary, #D8FF3E)',
  accentHex: '#D8FF3E',  // literal, por si se necesita fuera de CSS
  accentInk: '#0B0B0D',  // texto sobre acento

  // Semánticos
  danger: '#FF7847',     // alerta / riesgo (naranja)
  info: '#5DA9E0',       // informativo secundario (azul)

  // Texto
  title: '#FFFFFF',
  body: '#EDEDEF',
  muted: '#9A9CA2',
  hint: '#6A6C72'
}

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999
}

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32
}

export const font = {
  family:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  // Números clave (scores, pesos): grandes, tracking negativo, peso 500
  hero: { fontSize: 64, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 },
  big: { fontSize: 40, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 },
  number: { fontWeight: 500, letterSpacing: '-0.02em' },
  title: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em' },
  body: { fontSize: 15, fontWeight: 400 },
  small: { fontSize: 13, fontWeight: 400 },
  // Labels tipo "overline"
  overline: {
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: '1.8px',
    textTransform: 'uppercase'
  }
}

// Umbrales de color del Score de Disciplina
export const SCORE_STREAK_UMBRAL = 70

export function scoreColor(score) {
  if (score >= 75) return colors.accent // alto → lima
  if (score >= 50) return colors.title // medio → blanco
  return colors.danger // bajo → naranja
}

// Etiquetas legibles de enums
export const OBJETIVO_LABEL = {
  perdida_grasa: 'Pérdida de grasa',
  hipertrofia: 'Hipertrofia',
  recomposicion: 'Recomposición',
  mantenimiento: 'Mantenimiento'
}

export const MOMENTO_LABEL = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  snack: 'Snack'
}

export const DIAS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
