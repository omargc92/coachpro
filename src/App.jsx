// ============================================================
// Router raíz: decide entre Portal Atleta (?token=) | Login | Portal Coach
// ============================================================
import { Suspense, lazy, useState, useEffect } from 'react'
import { useAuth } from './lib/auth.jsx'
import { useCoach, useSubscription } from './lib/queries.js'
import { Screen, Loading, BottomNav, Empty, Button, Icon } from './lib/ui.jsx'
import { colors, space, font, radius } from './lib/theme.js'
import { BrandingProvider } from './lib/branding.jsx'
import { PlanProvider, usePlan } from './lib/usePlan.jsx'
import { Landing, Atletas, Rutinas, Catalogo, Agenda, ChatCoach, AtletaPortal, Configuracion, Planes, Onboarding } from './pages/Pages.jsx'

const AtletaDetalle = lazy(() =>
  import('./pages/coach/AtletaDetalle.jsx').then((m) => ({ default: m.AtletaDetalle }))
)
const Dashboard = lazy(() =>
  import('./pages/coach/Dashboard.jsx').then((m) => ({ default: m.Dashboard }))
)

const PARAMS  = new URLSearchParams(window.location.search)
const URL_TOKEN = PARAMS.get('token')
const CHECKOUT = PARAMS.get('checkout') // 'success' | 'cancelled'

// El atleta entra por ?token=. Al INSTALAR la PWA, el start_url es "/" (sin
// token), así que guardamos el token y lo reusamos cuando la app corre
// instalada (standalone). Así el atleta no cae por error en el panel del coach.
const ATLETA_TOKEN_KEY = 'coachpro_atleta_token'
const safeLocal = (fn) => { try { return fn() } catch { return null } }

if (URL_TOKEN) safeLocal(() => localStorage.setItem(ATLETA_TOKEN_KEY, URL_TOKEN))

const IS_STANDALONE =
  window.matchMedia?.('(display-mode: standalone)')?.matches ||
  window.navigator.standalone === true

// En navegador normal manda la URL (el coach puede entrar a "/" a loguearse).
// Instalada (standalone) sin token en la URL → usa el token guardado del atleta.
const TOKEN = URL_TOKEN || (IS_STANDALONE ? safeLocal(() => localStorage.getItem(ATLETA_TOKEN_KEY)) : null)

export default function App() {
  if (TOKEN) return <AtletaPortal token={TOKEN} />
  return <CoachApp checkoutResult={CHECKOUT} />
}

function CoachApp({ checkoutResult }) {
  const { user, loading: authLoading, signOut } = useAuth()
  // Si alguien entra como coach en este dispositivo, olvida cualquier token de
  // atleta guardado para que la PWA no lo redirija al portal por error.
  useEffect(() => {
    if (user) safeLocal(() => localStorage.removeItem(ATLETA_TOKEN_KEY))
  }, [user])
  const coachQ = useCoach(user)
  const subQ = useSubscription(coachQ.data?.id)
  const [tab, setTab] = useState(checkoutResult === 'success' ? 'planes' : 'atletas')
  const [detalleId, setDetalleId] = useState(null)

  if (authLoading) return <Screen><Loading /></Screen>
  if (!user) return <Landing />
  if (coachQ.isPending) return <Screen><Loading label="Preparando tu panel…" /></Screen>
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
  // Red de seguridad: si por un estado raro (query pausada offline, restauración
  // de caché) llegamos sin datos del coach, mostramos loading en vez de crashear.
  if (!coach) return <Screen><Loading label="Preparando tu panel…" /></Screen>

  if (detalleId)
    return (
      <BrandingProvider branding={coach}>
        <PlanProvider subscription={subQ.data}>
          <Suspense fallback={<Screen><Loading /></Screen>}>
            <AtletaDetalle coach={coach} atletaId={detalleId} onBack={() => setDetalleId(null)} />
          </Suspense>
        </PlanProvider>
      </BrandingProvider>
    )

  const showOnboarding = coach.onboarding_completado === false

  const screens = {
    atletas:  <Atletas coach={coach} onOpenAtleta={setDetalleId} onOpenCatalogo={() => setTab('catalogo')} />,
    rutinas:  <Rutinas coach={coach} />,
    agenda:   <Agenda coach={coach} />,
    chat:     <ChatCoach coach={coach} />,
    catalogo: <Catalogo coach={coach} />,
    negocio:  <Suspense fallback={<Screen><Loading /></Screen>}><Dashboard coach={coach} /></Suspense>,
    planes:   <Planes />,
    config:   <Configuracion coach={coach} />
  }

  const navItems = [
    { key: 'atletas', label: 'Atletas',  icon: 'users' },
    { key: 'rutinas', label: 'Rutinas',  icon: 'barbell' },
    { key: 'agenda',  label: 'Agenda',   icon: 'calendar' },
    { key: 'chat',    label: 'Chat',     icon: 'message-circle' },
    { key: 'negocio', label: 'Negocio',  icon: 'chart-bar' },
    { key: 'planes',  label: 'Planes',   icon: 'crown' }
  ]

  return (
    <BrandingProvider branding={coach}>
      <PlanProvider subscription={subQ.data}>
        <CoachHeader coach={coach} activeTab={tab} onConfig={() => setTab('config')} onPlanes={() => setTab('planes')} />
        <TrialBanner onVerPlanes={() => setTab('planes')} />
        <CheckoutBanner result={checkoutResult} />
        {screens[tab]}
        <BottomNav items={navItems} active={tab} onChange={setTab} />
        {showOnboarding && (
          <Onboarding coach={coach} onComplete={() => {}} />
        )}
      </PlanProvider>
    </BrandingProvider>
  )
}

function CoachHeader({ coach, activeTab, onConfig, onPlanes }) {
  if (activeTab === 'config' || activeTab === 'planes') return null
  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: `calc(env(safe-area-inset-top) + ${space.sm}px) ${space.md}px ${space.sm}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: colors.bg
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {coach.logo_url && (
          <img src={coach.logo_url} alt="" style={{ height: 32, maxWidth: 120, objectFit: 'contain', flexShrink: 0 }} />
        )}
        {/* El nombre se muestra junto al logo si está configurado; si no hay ni
            logo ni nombre, cae al nombre por defecto. */}
        {(coach.brand_name || !coach.logo_url) && (
          <span style={{ ...font.title, fontSize: 17, fontWeight: 700, color: colors.title, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {coach.brand_name || 'CoachPro'}
          </span>
        )}
      </div>
      <button
        onClick={onConfig}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: colors.muted, padding: 4 }}
        aria-label="Configuración"
      >
        <Icon name="settings" size={22} />
      </button>
    </div>
  )
}

// Banner de retorno de Stripe Checkout
function CheckoutBanner({ result }) {
  const [visible, setVisible] = useState(true)
  if (!result || !visible) return null

  const isSuccess = result === 'success'
  return (
    <div style={{
      maxWidth: 520, margin: '0 auto',
      padding: `${space.sm}px ${space.md}px`,
      background: isSuccess ? 'rgba(216,255,62,0.08)' : 'rgba(154,156,162,0.08)',
      borderBottom: `0.5px solid ${isSuccess ? colors.accent : colors.border}`,
      display: 'flex', alignItems: 'center', gap: space.sm
    }}>
      <Icon
        name={isSuccess ? 'circle-check' : 'circle-x'}
        size={16}
        color={isSuccess ? colors.accent : colors.muted}
      />
      <span style={{ ...font.small, color: colors.body, flex: 1 }}>
        {isSuccess
          ? 'Pago recibido — confirmando tu plan… puede tardar unos segundos.'
          : 'Pago cancelado. Tu plan actual sigue activo.'}
      </span>
      <button
        onClick={() => {
          setVisible(false)
          // Limpia el param de la URL sin recargar
          window.history.replaceState({}, '', window.location.pathname)
        }}
        style={{ background: 'transparent', border: 'none', color: colors.hint, cursor: 'pointer', padding: 2 }}
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  )
}

function TrialBanner({ onVerPlanes }) {
  const { isTrial, isExpired, daysLeftInTrial } = usePlan()

  if (!isTrial && !isExpired) return null

  const isUrgent = isTrial && daysLeftInTrial <= 3
  const bg = isExpired
    ? 'rgba(255,120,71,0.12)'
    : isUrgent
      ? 'rgba(255,120,71,0.08)'
      : 'rgba(216,255,62,0.06)'
  const borderColor = isExpired || isUrgent ? colors.danger : colors.accent
  const iconColor   = isExpired || isUrgent ? colors.danger : colors.accent

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: `${space.sm}px ${space.md}px`,
        background: bg,
        borderBottom: `0.5px solid ${borderColor}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
        <Icon name={isExpired ? 'alert-triangle' : 'clock'} size={16} color={iconColor} />
        <span style={{ ...font.small, color: colors.body, flex: 1 }}>
          {isExpired
            ? 'Tu prueba terminó — reactiva para seguir editando'
            : `Te quedan ${daysLeftInTrial} día${daysLeftInTrial !== 1 ? 's' : ''} de prueba`}
        </span>
        <button
          onClick={onVerPlanes}
          style={{
            background: 'transparent',
            border: `0.5px solid ${borderColor}`,
            borderRadius: radius.pill,
            color: iconColor,
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 10px',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          Ver planes
        </button>
      </div>
    </div>
  )
}
