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
  primary: DEFAULT_BRAND,
  accent: DEFAULT_BRAND
}

const BrandingCtx = createContext(BRANDING_DEFAULTS)

export function BrandingProvider({ branding, children }) {
  const value = {
    logoUrl: branding?.logo_url || null,
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
  }, [value.primary, value.accent])

  return <BrandingCtx.Provider value={value}>{children}</BrandingCtx.Provider>
}

export function useBranding() {
  return useContext(BrandingCtx)
}
