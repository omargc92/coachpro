// ============================================================
// PWA — hook de instalación + banner discreto (portal atleta)
// ============================================================
import { useEffect, useState } from 'react'
import { colors, radius, space, font } from './theme.js'
import { Icon } from './ui.jsx'

const DISMISS_KEY = 'coachpro_install_dismissed'

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
