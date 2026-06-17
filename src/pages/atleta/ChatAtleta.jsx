// ============================================================
// Portal atleta — CHAT con el coach.
// ============================================================
import { usePortalMensajes, useEnviarMensajePortal } from '../../lib/queries.js'
import { Loading } from '../../lib/ui.jsx'
import { ChatThread } from '../../lib/chat.jsx'

export function ChatAtleta({ token }) {
  const { data: mensajes, isLoading } = usePortalMensajes(token)
  const enviar = useEnviarMensajePortal(token)

  if (isLoading) return <Loading label="Cargando chat…" />
  return (
    <ChatThread mensajes={mensajes} yo="atleta" onEnviar={(t) => enviar.mutate(t)} enviando={enviar.isPending} />
  )
}
