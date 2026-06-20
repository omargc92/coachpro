// ============================================================
// Hilo de chat compartido (coach y atleta) — burbujas + input.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { colors, radius, space, font } from './theme.js'
import { Icon } from './ui.jsx'

export function ChatThread({ mensajes, yo, onEnviar, enviando }) {
  const [texto, setTexto] = useState('')
  const finRef = useRef(null)

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes?.length])

  function enviar() {
    const t = texto.trim()
    if (!t) return
    onEnviar(t)
    setTexto('')
  }

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: `${space.sm}px ${space.md}px`, display: 'flex', flexDirection: 'column' }}>
        {/* marginTop:auto → las burbujas se anclan abajo cuando hay pocas, y crecen
            hacia arriba; con muchas, el margen colapsa y scrollea normal. */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(!mensajes || mensajes.length === 0) && (
            <div style={{ ...font.small, color: colors.muted, textAlign: 'center' }}>
              Aún no hay mensajes. Escribe el primero.
            </div>
          )}
          {mensajes?.map((m) => {
          const mio = m.autor === yo
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mio ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '78%',
                  background: mio ? colors.accent : colors.surface2,
                  color: mio ? colors.accentInk : colors.body,
                  border: mio ? 'none' : `0.5px solid ${colors.border}`,
                  borderRadius: 16,
                  borderBottomRightRadius: mio ? 4 : 16,
                  borderBottomLeftRadius: mio ? 16 : 4,
                  padding: '9px 13px',
                  ...font.body,
                  fontSize: 14.5
                }}
              >
                {m.texto}
              </div>
            </div>
          )
        })}
          <div ref={finRef} />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: space.md,
          paddingBottom: `calc(${space.md}px + env(safe-area-inset-bottom))`,
          borderTop: `0.5px solid ${colors.border}`,
          background: colors.bg
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          placeholder="Mensaje…"
          style={{
            flex: 1,
            background: colors.surface2,
            border: `0.5px solid ${colors.border}`,
            borderRadius: radius.pill,
            padding: '11px 16px',
            color: colors.title,
            fontFamily: font.family,
            fontSize: 15,
            outline: 'none'
          }}
        />
        <button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          style={{
            background: colors.accent,
            color: colors.accentInk,
            border: 'none',
            borderRadius: radius.pill,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: texto.trim() ? 'pointer' : 'default',
            opacity: texto.trim() ? 1 : 0.5,
            flexShrink: 0
          }}
        >
          <Icon name="send" size={20} />
        </button>
      </div>
    </>
  )
}
