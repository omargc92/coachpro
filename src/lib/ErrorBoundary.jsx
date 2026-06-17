// ============================================================
// Error Boundary raíz — pinta el error en pantalla en vez de
// dejar un "loading" mudo si algo falla al montar/renderizar.
// (No atrapa bucles síncronos, pero sí cualquier excepción.)
// ============================================================
import { Component } from 'react'
import { colors, space, font } from './theme.js'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[CoachPro] Error de render:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: colors.bg,
          color: colors.body,
          fontFamily: font.family,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: space.lg,
          gap: space.sm
        }}
      >
        <div style={{ ...font.title, color: colors.title }}>Algo salió mal</div>
        <div style={{ ...font.small, color: colors.muted, maxWidth: 360 }}>
          La app no pudo cargar. Recarga la página; si persiste, avísale a tu coach.
        </div>
        <pre
          style={{
            ...font.small,
            color: colors.danger,
            background: colors.surface2,
            border: `0.5px solid ${colors.border}`,
            borderRadius: 10,
            padding: space.sm,
            maxWidth: '90vw',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap'
          }}
        >
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: space.sm,
            background: colors.accent,
            color: colors.accentInk,
            border: 'none',
            borderRadius: 12,
            padding: '12px 20px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Recargar
        </button>
      </div>
    )
  }
}
