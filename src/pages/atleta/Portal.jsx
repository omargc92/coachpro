// ============================================================
// Portal del atleta (por token) — shell con navegación inferior.
// ============================================================
import { Suspense, lazy, useState } from 'react'
import { Screen, BottomNav, Loading } from '../../lib/ui.jsx'
import { InstallBanner } from '../../lib/pwa.jsx'
import { Hoy } from './Hoy.jsx'
import { Nutricion } from './Nutricion.jsx'
import { ChatAtleta } from './ChatAtleta.jsx'

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

  // El chat ocupa toda la altura (input fijo abajo).
  if (tab === 'chat') {
    return (
      <>
        <Screen pad={false} style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
          <ChatAtleta token={token} />
        </Screen>
        <BottomNav items={NAV} active={tab} onChange={setTab} />
      </>
    )
  }

  return (
    <>
      <Screen>
        <InstallBanner />
        {tab === 'hoy' && <Hoy token={token} onIrNutricion={() => setTab('nutricion')} />}
        {tab === 'nutricion' && <Nutricion token={token} />}
        {tab === 'progreso' && (
          <Suspense fallback={<Loading />}>
            <Progreso token={token} />
          </Suspense>
        )}
      </Screen>
      <BottomNav items={NAV} active={tab} onChange={setTab} />
    </>
  )
}
