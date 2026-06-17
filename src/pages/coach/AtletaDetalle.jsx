// ============================================================
// Detalle de atleta (coach): mediciones, rutina, nutrición,
// asistencias y link del portal.
// ============================================================
import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'
import {
  useAtleta, useMediciones, useAsignacionesAtleta, useAtletaActividad
} from '../../lib/queries.js'
import {
  Screen, Header, Card, Row, Overline, Bar, Button, Badge, Icon, Loading, Empty
} from '../../lib/ui.jsx'
import { colors, space, font, radius, OBJETIVO_LABEL, DIAS } from '../../lib/theme.js'

export function AtletaDetalle({ atletaId, onBack }) {
  const { data: at, isLoading } = useAtleta(atletaId)
  const { data: med } = useMediciones(atletaId)
  const { data: asign } = useAsignacionesAtleta(atletaId)
  const { data: act } = useAtletaActividad(atletaId)
  const [copiado, setCopiado] = useState(false)

  if (isLoading || !at) return <Screen><Loading /></Screen>

  async function copiarLink() {
    const url = `${window.location.origin}/?token=${at.token}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Copia el link del portal:', url)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  return (
    <Screen>
      <Header
        title={at.nombre}
        subtitle={OBJETIVO_LABEL[at.objetivo]}
        onBack={onBack}
      />

      <Button
        variant="surface"
        icon={copiado ? 'check' : 'link'}
        onClick={copiarLink}
        style={{ marginBottom: space.lg, color: copiado ? colors.accent : colors.body }}
      >
        {copiado ? 'Link copiado' : 'Copiar link del portal'}
      </Button>

      {/* --- Mediciones --- */}
      <SeccionTitulo>Mediciones</SeccionTitulo>
      <Mediciones med={med} />

      {/* --- Rutina asignada --- */}
      <SeccionTitulo>Rutina asignada</SeccionTitulo>
      <Card style={{ marginBottom: space.lg }}>
        {!asign?.length && <Vacio>Sin rutinas asignadas todavía.</Vacio>}
        {asign?.map((a) => (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: space.sm,
              padding: '8px 0',
              borderBottom: `0.5px solid ${colors.border}`
            }}
          >
            <Badge color={a.activa ? colors.accent : colors.hint} style={{ minWidth: 42, justifyContent: 'center' }}>
              {DIAS[a.dia_semana]}
            </Badge>
            <span style={{ ...font.body, color: colors.title }}>{a.rutinas?.nombre || '—'}</span>
          </div>
        ))}
      </Card>

      {/* --- Nutrición hoy --- */}
      <SeccionTitulo>Adherencia nutricional · hoy</SeccionTitulo>
      <Nutricion act={act} />

      {/* --- Asistencias --- */}
      <SeccionTitulo>Asistencias recientes</SeccionTitulo>
      <Card style={{ marginBottom: space.lg }}>
        {!act?.asistencias?.length && <Vacio>Sin asistencias registradas.</Vacio>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {act?.asistencias?.map((a) => (
            <Badge key={a.fecha} color={a.presente ? colors.accent : colors.hint}>
              <Icon name="check" size={11} /> {fechaCorta(a.fecha)}
            </Badge>
          ))}
        </div>
      </Card>

      {/* --- Chat (fase 4) --- */}
      <Button variant="ghost" icon="message-circle" disabled>
        Abrir chat (Fase 4)
      </Button>
    </Screen>
  )
}

function Mediciones({ med }) {
  if (!med) return <Loading />
  if (!med.length)
    return (
      <Card style={{ marginBottom: space.lg }}>
        <Vacio>Sin mediciones registradas.</Vacio>
      </Card>
    )
  const ultima = med[med.length - 1]
  const primera = med[0]
  const delta = (ultima.peso_kg - primera.peso_kg).toFixed(1)
  const data = med.map((m) => ({ fecha: fechaCorta(m.fecha), peso: Number(m.peso_kg) }))

  return (
    <Card style={{ marginBottom: space.lg }}>
      <Row style={{ marginBottom: space.sm }}>
        <div style={{ flex: 1 }}>
          <Overline>Peso actual</Overline>
          <div style={{ ...font.big, fontSize: 34, color: colors.title }}>
            {Number(ultima.peso_kg)}<span style={{ fontSize: 16, color: colors.muted }}> kg</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Overline>Cambio</Overline>
          <div style={{ ...font.big, fontSize: 34, color: delta <= 0 ? colors.accent : colors.info }}>
            {delta > 0 ? '+' : ''}{delta}<span style={{ fontSize: 16, color: colors.muted }}> kg</span>
          </div>
        </div>
        {ultima.grasa_pct != null && (
          <div style={{ flex: 1 }}>
            <Overline>Grasa</Overline>
            <div style={{ ...font.big, fontSize: 34, color: colors.title }}>
              {Number(ultima.grasa_pct)}<span style={{ fontSize: 16, color: colors.muted }}>%</span>
            </div>
          </div>
        )}
      </Row>

      <div style={{ height: 150, marginLeft: -8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="fecha" tick={{ fill: colors.hint, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              domain={['dataMin - 1', 'dataMax + 1']}
              tick={{ fill: colors.hint, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: colors.surface2,
                border: `0.5px solid ${colors.border}`,
                borderRadius: radius.sm,
                color: colors.title,
                fontSize: 12
              }}
              labelStyle={{ color: colors.muted }}
            />
            <Line
              type="monotone"
              dataKey="peso"
              stroke={colors.accent}
              strokeWidth={2.5}
              dot={{ r: 3, fill: colors.accent }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function Nutricion({ act }) {
  if (!act) return <Loading />
  if (!act.objetivo)
    return (
      <Card style={{ marginBottom: space.lg }}>
        <Vacio>Sin objetivos de nutrición definidos.</Vacio>
      </Card>
    )
  const { objetivo: o, consumido: c } = act
  const pct = (v, m) => (m ? Math.min(100, Math.round((v / m) * 100)) : 0)
  return (
    <Card style={{ marginBottom: space.lg, display: 'flex', flexDirection: 'column', gap: space.md }}>
      <MacroBar label="Proteína" v={c.proteina_g} m={o.proteina_g} unit="g" color={colors.accent} pct={pct} />
      <MacroBar label="Calorías" v={c.kcal} m={o.kcal} unit="kcal" color={colors.info} pct={pct} />
      <MacroBar label="Carbos" v={c.carbos_g} m={o.carbos_g} unit="g" color={colors.muted} pct={pct} />
      <MacroBar label="Grasas" v={c.grasas_g} m={o.grasas_g} unit="g" color={colors.muted} pct={pct} />
    </Card>
  )
}

function MacroBar({ label, v, m, unit, color, pct }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <Overline>{label}</Overline>
        <span style={{ ...font.small, color: colors.muted }}>
          <span style={{ color: colors.title, fontWeight: 600 }}>{v}</span> / {m} {unit}
        </span>
      </div>
      <Bar value={pct(v, m)} color={color} />
    </div>
  )
}

// --- helpers de UI ---
function SeccionTitulo({ children }) {
  return <Overline style={{ marginBottom: space.sm }}>{children}</Overline>
}
function Vacio({ children }) {
  return <div style={{ ...font.small, color: colors.muted, textAlign: 'center', padding: space.sm }}>{children}</div>
}
function fechaCorta(f) {
  const [, m, d] = f.split('-')
  return `${d}/${m}`
}
