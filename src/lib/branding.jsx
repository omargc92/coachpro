// ============================================================
// Contexto de branding por coach.
// Provee logo_url, brand_primary y brand_accent a todo el árbol.
// Si no hay valores del coach, devuelve los defaults del design system.
// ============================================================
import { createContext, useContext } from 'react'
import { colors } from './theme.js'

export const BRANDING_DEFAULTS = {
  logoUrl: null,
  primary: colors.accent,   // #D8FF3E
  accent: colors.accent
}

const BrandingCtx = createContext(BRANDING_DEFAULTS)

export function BrandingProvider({ branding, children }) {
  const value = {
    logoUrl: branding?.logo_url || null,
    primary: branding?.brand_primary || BRANDING_DEFAULTS.primary,
    accent:  branding?.brand_accent  || BRANDING_DEFAULTS.accent
  }
  return <BrandingCtx.Provider value={value}>{children}</BrandingCtx.Provider>
}

export function useBranding() {
  return useContext(BrandingCtx)
}
