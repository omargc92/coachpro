// ============================================================
// Chat (coach): lista de conversaciones + hilo por atleta.
// ============================================================
import { useState } from 'react'
import { useConversaciones, useHilo, useEnviarMensajeCoach } from '../../lib/queries.js'
import { Screen, Header, Card, Avatar, Badge, Loading, Empty, Icon } from '../../lib/ui.jsx'
import { ChatThread } from '../../lib/chat.jsx'
import { colors, space, font, radius } from '../../lib/theme.js'
import { usePlan } from '../../lib/usePlan.jsx'

export function ChatCoach({ coach }) {
  const { data, isLoading } = useConversaciones(coach)
  const { hasFeature } = usePlan()
  const [activo, setActivo] = useState(null) // {id, nombre}

  if (!hasFeature('chat')) {
    return (
      <Screen>
        <Header title="Chat" subtitle="Conversaciones" />
        <div style={{
          textAlign: 'center', padding: `${space.xl}px ${space.md}px`,
          border: `0.5px solid ${colors.border}`, borderRadius: radius.lg,
          background: colors.surface2
        }}>
          <Icon name="lock" size={36} color={colors.hint} />
          <div style={{ ...font.title, color: colors.body, marginTop: space.md }}>Chat no disponible</div>
          <div style={{ ...font.small, color: colors.muted, marginTop: 8 }}>
            El chat está incluido en los planes Pro y Premium. Reactiva tu plan para usar esta función.
          </div>
        </div>
      </Screen>
    )
  }

  if (activo) return <ChatCoachHilo atleta={activo} onBack={() => setActivo(null)} />

  return (
    <Screen>
      <Header title="Chat" subtitle="Conversaciones" />
      {isLoading && <Loading />}
      {data && data.length === 0 && <Empty icon="message-circle" title="Sin atletas" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {data?.map((c) => (
          <Card key={c.id} onClick={() => setActivo({ id: c.id, nombre: c.nombre })} style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
            <Avatar nombre={c.nombre} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...font.body, fontWeight: 600, color: colors.title }}>{c.nombre}</div>
              <div style={{ ...font.small, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.ultimo ? `${c.ultimo.autor === 'coach' ? 'Tú: ' : ''}${c.ultimo.texto}` : 'Sin mensajes'}
              </div>
            </div>
            {c.noLeidos > 0 && <Badge color={colors.accent}>{c.noLeidos}</Badge>}
          </Card>
        ))}
      </div>
    </Screen>
  )
}

function ChatCoachHilo({ atleta, onBack }) {
  const { data: mensajes, isLoading } = useHilo(atleta.id)
  const enviar = useEnviarMensajeCoach(atleta.id)
  return (
    <Screen pad={false} style={{ display: 'flex', flexDirection: 'column', height: '100dvh', paddingBottom: 'calc(64px + env(safe-area-inset-bottom))' }}>
      <div style={{ padding: `${space.md}px ${space.md}px 0` }}>
        <Header title={atleta.nombre} subtitle="Chat" onBack={onBack} />
      </div>
      {isLoading ? (
        <Loading />
      ) : (
        <ChatThread mensajes={mensajes} yo="coach" onEnviar={(t) => enviar.mutate(t)} enviando={enviar.isPending} />
      )}
    </Screen>
  )
}
