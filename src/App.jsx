// ============================================================
// Router raíz: decide entre Portal Atleta (?token=) | Login | Portal Coach
// Navegación por estado (mobile-first), sin react-router.
// ============================================================
import { Suspense, lazy, useState } from 'react'
import { useAuth } from './lib/auth.jsx'
import { useCoach } from './lib/queries.js'
import { Screen, Loading, BottomNav, Empty, Button } from './lib/ui.jsx'
import { Login, Atletas, Rutinas, Catalogo, Agenda, ChatCoach, AtletaPortal } from './pages/Pages.jsx'

// Lazy: la pantalla con Recharts se carga solo al abrir el detalle.
const AtletaDetalle = lazy(() =>
  import('./pages/coach/AtletaDetalle.jsx').then((m) => ({ default: m.AtletaDetalle }))
)

const TOKEN = new URLSearchParams(window.location.search).get('token')

export default function App() {
  // --- Portal del atleta por token (sin login) ---
  if (TOKEN) return <AtletaPortal token={TOKEN} />

  // --- Portal del coach (autenticado) ---
  return <CoachApp />
}

function CoachApp() {
  const { user, loading: authLoading, signOut } = useAuth()
  const coachQ = useCoach(user)
  const [tab, setTab] = useState('atletas')
  const [detalleId, setDetalleId] = useState(null)

  if (authLoading) return <Screen><Loading /></Screen>
  if (!user) return <Login />
  if (coachQ.isLoading) return <Screen><Loading label="Preparando tu panel…" /></Screen>
  if (coachQ.error)
    return (
      <Screen>
        <Empty
          icon="alert-triangle"
          title="No se pudo cargar el panel"
          hint={String(coachQ.error.message || coachQ.error)}
          action={<Button onClick={() => signOut()}>Cerrar sesión</Button>}
        />
      </Screen>
    )

  const coach = coachQ.data

  // Detalle de atleta tiene su propia vista (sin nav inferior).
  if (detalleId)
    return (
      <Suspense fallback={<Screen><Loading /></Screen>}>
        <AtletaDetalle coach={coach} atletaId={detalleId} onBack={() => setDetalleId(null)} />
      </Suspense>
    )

  const screens = {
    atletas: <Atletas coach={coach} onOpenAtleta={setDetalleId} onOpenCatalogo={() => setTab('catalogo')} />,
    rutinas: <Rutinas coach={coach} />,
    agenda: <Agenda coach={coach} />,
    chat: <ChatCoach coach={coach} />,
    catalogo: <Catalogo coach={coach} />
  }

  const navItems = [
    { key: 'atletas', label: 'Atletas', icon: 'users' },
    { key: 'rutinas', label: 'Rutinas', icon: 'barbell' },
    { key: 'agenda', label: 'Agenda', icon: 'calendar' },
    { key: 'chat', label: 'Chat', icon: 'message-circle' }
  ]

  return (
    <>
      {screens[tab]}
      <BottomNav items={navItems} active={tab} onChange={setTab} />
    </>
  )
}
