// ============================================================
// Agenda (coach): sesiones de HOY por atleta.
// ============================================================
import { useAgenda } from '../../lib/queries.js'
import { Screen, Header, Card, Avatar, Badge, Icon, Overline, Loading, Empty } from '../../lib/ui.jsx'
import { colors, space, font, DIAS } from '../../lib/theme.js'
import { isodowHoy } from '../../lib/queries.js'

const ESTADO = {
  completada: { label: 'Completada', color: '#D8FF3E', icon: 'circle-check' },
  en_curso: { label: 'En curso', color: '#5DA9E0', icon: 'player-play' },
  pendiente: { label: 'Pendiente', color: '#FF7847', icon: 'clock' },
  descanso: { label: 'Descanso', color: '#6A6C72', icon: 'zzz' }
}

export function Agenda({ coach }) {
  const { data, isLoading } = useAgenda(coach)
  const hoy = DIAS[isodowHoy()]

  const conRutina = data?.filter((a) => a.estado !== 'descanso') || []
  const descanso = data?.filter((a) => a.estado === 'descanso') || []

  return (
    <Screen>
      <Header title="Agenda" subtitle={`Hoy · ${hoy}`} />

      {isLoading && <Loading />}
      {data && data.length === 0 && <Empty icon="calendar" title="Sin atletas" />}

      {conRutina.length > 0 && <Overline style={{ marginBottom: space.sm }}>Entrenan hoy</Overline>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm, marginBottom: space.lg }}>
        {conRutina.map((a) => (
          <FilaAgenda key={a.id} a={a} />
        ))}
      </div>

      {descanso.length > 0 && <Overline style={{ marginBottom: space.sm }}>Descanso</Overline>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {descanso.map((a) => (
          <FilaAgenda key={a.id} a={a} />
        ))}
      </div>
    </Screen>
  )
}

function FilaAgenda({ a }) {
  const e = ESTADO[a.estado]
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
      <Avatar nombre={a.nombre} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...font.body, fontWeight: 600, color: colors.title }}>{a.nombre}</div>
        <div style={{ ...font.small, color: colors.muted }}>{a.rutinaHoy || 'Día de descanso'}</div>
      </div>
      <Badge color={e.color}>
        <Icon name={e.icon} size={12} /> {e.label}
      </Badge>
    </Card>
  )
}
