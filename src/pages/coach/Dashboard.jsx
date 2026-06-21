// ============================================================
// Fase D — Dashboard de negocio del coach.
// Gating: hasFeature('businessDashboard') → Pro o superior.
// ============================================================
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { useAtletasResumen } from '../../lib/queries.js'
import { usePlan } from '../../lib/usePlan.jsx'
import { PLANS } from '../../lib/plans.js'
import { Screen, Header, Card, Row, Stat, Overline, Icon, Loading, Empty } from '../../lib/ui.jsx'
import { colors, space, font, radius, scoreColor } from '../../lib/theme.js'

export function Dashboard({ coach }) {
  const { hasFeature } = usePlan()
  const plan = usePlan()

  if (!hasFeature('businessDashboard')) {
    return (
      <Screen>
        <Header title="Negocio" subtitle="Dashboard de negocio" />
        <LockedDashboard planActual={plan.plan} />
      </Screen>
    )
  }

  return <DashboardContent coach={coach} plan={plan} />
}

function DashboardContent({ coach, plan }) {
  const { data: atletas, isLoading } = useAtletasResumen(coach)

  if (isLoading) return <Screen><Loading label="Cargando métricas…" /></Screen>

  const total         = atletas?.length ?? 0
  const enGym         = atletas?.filter(a => a.asistioHoy).length ?? 0
  const enRiesgo      = atletas?.filter(a => a.enRiesgo) ?? []
  const maxAtletas    = PLANS[plan.plan]?.maxAthletes ?? 0
  const activosReciente = atletas?.filter(a => (a.diasSinRegistro ?? 99) < 7).length ?? 0
  const adherenciaPct = total ? Math.round((activosReciente / total) * 100) : 0

  // Datos para la gráfica (top 10 por score)
  const chartData = (atletas ?? [])
    .slice(0, 10)
    .map(a => ({
      nombre: a.nombre.split(' ')[0],
      score: a.score,
      enRiesgo: a.enRiesgo
    }))

  return (
    <Screen>
      <Header title="Negocio" subtitle="Visión general del gym" />

      {/* Tarjetas de resumen */}
      <Row style={{ marginBottom: space.md }}>
        <Stat
          label={maxAtletas === Infinity ? 'Activos' : `Activos / ${maxAtletas}`}
          value={maxAtletas === Infinity ? total : `${total}/${maxAtletas}`}
          accent={total >= maxAtletas * 0.9 ? colors.danger : colors.accent}
        />
        <Stat label="Hoy en gym" value={enGym} accent={colors.accent} />
        <Stat label="En riesgo" value={enRiesgo.length} accent={enRiesgo.length ? colors.danger : colors.title} />
      </Row>

      {/* Adherencia 7 días */}
      <Card style={{ marginBottom: space.md }}>
        <Overline style={{ marginBottom: space.sm }}>Adherencia últimos 7 días</Overline>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: space.md }}>
          <div style={{ ...font.big, fontSize: 46, color: colors.accent, lineHeight: 1 }}>
            {adherenciaPct}<span style={{ fontSize: 20, color: colors.muted }}>%</span>
          </div>
          <div style={{ ...font.small, color: colors.muted, paddingBottom: 6 }}>
            {activosReciente} de {total} atletas activos esta semana
          </div>
        </div>

        {/* Barra de porcentaje */}
        <div style={{ height: 6, background: colors.surface2, borderRadius: radius.pill, marginTop: space.sm, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${adherenciaPct}%`,
            background: adherenciaPct >= 70 ? colors.accent : adherenciaPct >= 40 ? colors.info : colors.danger,
            borderRadius: radius.pill,
            transition: 'width 600ms ease'
          }} />
        </div>
      </Card>

      {/* Gráfica de scores */}
      {chartData.length > 0 && (
        <Card style={{ marginBottom: space.md }}>
          <Overline style={{ marginBottom: space.sm }}>Score de disciplina · hoy</Overline>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <XAxis
                  dataKey="nombre"
                  tick={{ fill: colors.hint, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: colors.hint, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(216,255,62,0.06)' }}
                  contentStyle={{
                    background: colors.surface2,
                    border: `0.5px solid ${colors.border}`,
                    borderRadius: radius.sm,
                    fontSize: 12,
                    color: colors.title
                  }}
                  labelStyle={{ color: colors.muted }}
                  formatter={(v) => [`${v} pts`, 'Score']}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={scoreColor(entry.score)} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Lista de atletas en riesgo */}
      {enRiesgo.length > 0 && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, marginBottom: space.sm }}>
            <Icon name="alert-triangle" size={16} color={colors.danger} />
            <Overline style={{ color: colors.danger }}>Atletas en riesgo</Overline>
          </div>
          {enRiesgo.map(a => (
            <div key={a.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0',
              borderBottom: `0.5px solid ${colors.border}`
            }}>
              <div style={{ ...font.body, color: colors.title }}>{a.nombre}</div>
              <div style={{ ...font.small, color: colors.danger }}>
                {a.diasSinRegistro}d sin actividad
              </div>
            </div>
          ))}
        </Card>
      )}

      {total === 0 && (
        <Empty icon="chart-bar" title="Sin datos aún" hint="Agrega atletas para ver métricas de negocio." />
      )}
    </Screen>
  )
}

function LockedDashboard({ planActual }) {
  return (
    <Card style={{ textAlign: 'center', padding: space.xl }}>
      <div style={{ marginBottom: space.md }}>
        <Icon name="lock" size={36} color={colors.hint} />
      </div>
      <div style={{ ...font.title, fontSize: 17, fontWeight: 700, color: colors.title, marginBottom: space.sm }}>
        Dashboard de negocio
      </div>
      <div style={{ ...font.small, color: colors.muted, marginBottom: space.lg, lineHeight: 1.6 }}>
        Métricas de adherencia, scores y atletas en riesgo disponibles en plan <strong style={{ color: colors.accent }}>Pro</strong> o superior.
      </div>
      <div style={{
        display: 'inline-block',
        padding: '6px 18px',
        borderRadius: radius.pill,
        border: `0.5px solid ${colors.border}`,
        ...font.small,
        color: colors.muted
      }}>
        Plan actual: <span style={{ color: colors.title, textTransform: 'capitalize' }}>{planActual}</span>
      </div>
    </Card>
  )
}
