// ============================================================
// PWA — hook de instalación + banner discreto (portal atleta)
//       + aviso de actualización (service worker en modo 'prompt')
// ============================================================
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { colors, radius, space, font } from './theme.js'
import { Icon } from './ui.jsx'

const DISMISS_KEY = 'coachpro_install_dismissed'

// Aviso "Nueva versión disponible". Con registerType:'prompt' el SW nuevo
// queda en espera; al tocar "Actualizar" llamamos updateServiceWorker(true)
// (skipWaiting + recarga controlada). Nunca recarga solo → sin loops/cuelgues.
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError(err) {
      console.error('[CoachPro] registro del service worker falló:', err)
    }
  })

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top) + 8px)',
        left: 8,
        right: 8,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: space.sm,
          width: '100%',
          maxWidth: 520,
          background: colors.surface2,
          border: `0.5px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: '10px 12px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)'
        }}
      >
        <Icon name="refresh" size={18} color={colors.accent} />
        <span style={{ ...font.small, color: colors.title, flex: 1 }}>Nueva versión disponible</span>
        <button
          onClick={() => updateServiceWorker(true)}
          style={{
            background: colors.accent,
            color: colors.accentInk,
            border: 'none',
            borderRadius: radius.sm,
            padding: '8px 14px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
}
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return

    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // iOS no dispara beforeinstallprompt → mostramos instrucción manual.
    if (isIOS()) setVisible(true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, '1')
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismiss()
  }

  return { visible, install, dismiss, ios: isIOS() && !deferred }
}

export function InstallBanner() {
  const { visible, install, dismiss, ios } = useInstallPrompt()
  if (!visible) return null

  return (
    <div
      style={{
        background: colors.surface2,
        border: `0.5px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: space.md,
        marginBottom: space.md,
        display: 'flex',
        alignItems: 'center',
        gap: space.sm
      }}
    >
      <img
        src="/logo.png"
        alt="CoachPro"
        width={38}
        height={38}
        style={{ borderRadius: '50%', display: 'block', flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...font.small, fontWeight: 600, color: colors.title }}>
          Instala CoachPro en tu teléfono
        </div>
        <div style={{ ...font.small, color: colors.muted, fontSize: 12 }}>
          {ios ? (
            <span>
              Toca <Icon name="share-2" size={13} /> Compartir → “Agregar a inicio”.
            </span>
          ) : (
            'Acceso directo, pantalla completa, funciona offline.'
          )}
        </div>
      </div>
      {!ios && (
        <button
          onClick={install}
          style={{
            background: colors.accent,
            color: colors.accentInk,
            border: 'none',
            borderRadius: radius.sm,
            padding: '8px 12px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Instalar
        </button>
      )}
      <button
        onClick={dismiss}
        style={{ background: 'transparent', border: 'none', color: colors.hint, cursor: 'pointer', padding: 4 }}
      >
        <Icon name="x" size={18} />
      </button>
    </div>
  )
}
