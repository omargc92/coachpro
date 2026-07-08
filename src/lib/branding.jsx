// ============================================================
// Contexto de branding por coach.
// Provee logo_url, brand_primary y brand_accent a todo el árbol.
// Si no hay valores del coach, devuelve los defaults del design system.
// ============================================================
import { createContext, useContext, useEffect } from 'react'
import { colors } from './theme.js'

// El lima por defecto (literal, no la var — este es el valor real de fallback).
const DEFAULT_BRAND = colors.accentHex // #D8FF3E

export const BRANDING_DEFAULTS = {
  logoUrl: null,
  name: 'CoachPro',
  primary: DEFAULT_BRAND,
  accent: DEFAULT_BRAND
}

const BrandingCtx = createContext(BRANDING_DEFAULTS)

export function BrandingProvider({ branding, children }) {
  const value = {
    logoUrl: branding?.logo_url || null,
    // Nombre crudo: null si el coach no configuró uno (para decidir si mostrarlo
    // junto al logo o caer al nombre por defecto cuando tampoco hay logo).
    name:    branding?.brand_name || null,
    primary: branding?.brand_primary || BRANDING_DEFAULTS.primary,
    accent:  branding?.brand_accent  || BRANDING_DEFAULTS.accent
  }

  // Publica los colores de marca como variables CSS en el root. Todo el
  // design system (colors.accent → var(--cp-primary), botón → var(--cp-accent))
  // los toma automáticamente, con el lima como fallback.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--cp-primary', value.primary)
    root.style.setProperty('--cp-accent', value.accent)

    // Ícono de la app en iOS ("Agregar a inicio"). iOS lo lee del
    // apple-touch-icon de la página al instalar, así que lo apuntamos al logo
    // del coach. Solo raster (PNG/JPG): iOS no soporta SVG para el ícono.
    if (value.logoUrl && /\.(png|jpe?g)(\?|$)/i.test(value.logoUrl)) {
      let link = document.querySelector('link[rel="apple-touch-icon"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'apple-touch-icon'
        document.head.appendChild(link)
      }
      link.href = value.logoUrl
    }
  }, [value.primary, value.accent, value.logoUrl])

  return <BrandingCtx.Provider value={value}>{children}</BrandingCtx.Provider>
}

export function useBranding() {
  return useContext(BrandingCtx)
}

// Recuerda la última marca del coach en el dispositivo, para poder mostrarla
// en la pantalla previa al login (donde aún no sabemos quién es).
const LAST_BRAND_KEY = 'coachpro_last_brand'

export function persistBrand(coach) {
  try {
    if (!coach) return
    if (coach.logo_url || coach.brand_name || coach.brand_primary || coach.brand_accent) {
      localStorage.setItem(LAST_BRAND_KEY, JSON.stringify({
        logo_url: coach.logo_url || null,
        brand_name: coach.brand_name || null,
        brand_primary: coach.brand_primary || null,
        brand_accent: coach.brand_accent || null
      }))
    }
  } catch { /* no crítico */ }
}

export function readLastBrand() {
  try { return JSON.parse(localStorage.getItem(LAST_BRAND_KEY) || 'null') } catch { return null }
}
