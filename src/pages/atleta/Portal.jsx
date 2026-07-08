// ============================================================
// Portal del atleta (por token) — shell con navegación inferior.
// ============================================================
import { Suspense, lazy, useState } from 'react'
import { useMutationState } from '@tanstack/react-query'
import { Screen, BottomNav, Loading, Icon } from '../../lib/ui.jsx'
import { InstallBanner } from '../../lib/pwa.jsx'
import { BrandingProvider } from '../../lib/branding.jsx'
import { usePortalBranding } from '../../lib/queries.js'
import { colors, space, font, radius } from '../../lib/theme.js'
import { Hoy } from './Hoy.jsx'
import { Nutricion } from './Nutricion.jsx'
import { ChatAtleta } from './ChatAtleta.jsx'

// Indicador de cambios registrados sin conexión, aún por sincronizar.
function SyncBadge() {
  const pendientes = useMutationState({
    filters: {
      predicate: (m) =>
        m.state.isPaused && Array.isArray(m.options.mutationKey) && m.options.mutationKey[0] === 'portal'
    }
  })
  const n = pendientes.length
  if (!n) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(255,120,71,0.10)', border: `0.5px solid ${colors.border}`,
      borderRadius: radius.md, padding: `${space.sm}px ${space.md}px`, marginBottom: space.sm
    }}>
      <Icon name="cloud-off" size={15} color={colors.info} />
      <span style={{ ...font.small, color: colors.body }}>
        {n} {n === 1 ? 'registro' : 'registros'} pendiente{n === 1 ? '' : 's'} de sincronizar
      </span>
    </div>
  )
}

// Lazy: Progreso carga Recharts solo cuando se abre.
const Progreso = lazy(() => import('./Progreso.jsx').then((m) => ({ default: m.Progreso })))

const NAV = [
  { key: 'hoy', label: 'Hoy', icon: 'flame' },
  { key: 'nutricion', label: 'Nutrición', icon: 'salad' },
  { key: 'progreso', label: 'Progreso', icon: 'chart-line' },
  { key: 'chat', label: 'Chat', icon: 'message-circle' }
]

export function AtletaPortal({ token }) {
  const [tab, setTab] = useState('hoy')
  const brandingQ = usePortalBranding(token)
  const branding = brandingQ.data || null

  // Plan 'fit' (o expirado) → sin asesoría: se oculta la tab de Chat.
  // Solo se oculta si el backend lo dice explícitamente (chat_enabled === false),
  // para no romper planes existentes mientras la RPC 0011 no esté desplegada.
  const chatHabilitado = branding?.chat_enabled !== false
  const nav = chatHabilitado ? NAV : NAV.filter((n) => n.key !== 'chat')
  const tabActiva = tab === 'chat' && !chatHabilitado ? 'hoy' : tab

  // El chat ocupa toda la altura (input fijo abajo).
  if (tabActiva === 'chat') {
    return (
      <BrandingProvider branding={branding}>
        <Screen pad={false} style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
          <ChatAtleta token={token} />
        </Screen>
        <BottomNav items={nav} active={tabActiva} onChange={setTab} />
      </BrandingProvider>
    )
  }

  return (
    <BrandingProvider branding={branding}>
      <Screen>
        <InstallBanner />
        <SyncBadge />
        {tabActiva === 'hoy' && <Hoy token={token} onIrNutricion={() => setTab('nutricion')} />}
        {tabActiva === 'nutricion' && <Nutricion token={token} />}
        {tabActiva === 'progreso' && (
          <Suspense fallback={<Loading />}>
            <Progreso token={token} />
          </Suspense>
        )}
      </Screen>
      <BottomNav items={nav} active={tabActiva} onChange={setTab} />
    </BrandingProvider>
  )
}
