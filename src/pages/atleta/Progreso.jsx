// ============================================================
// Portal atleta — PROGRESO: gráfica de peso/medidas + historial.
// (Lazy-loaded por Recharts.)
// ============================================================
import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'
import { usePortalProgreso } from '../../lib/queries.js'
import { Card, Overline, Badge, Icon, Loading, Empty, Row } from '../../lib/ui.jsx'
import { colors, space, font, radius } from '../../lib/theme.js'

const METRICAS = [
  { key: 'peso_kg', label: 'Peso', unit: 'kg' },
  { key: 'grasa_pct', label: 'Grasa', unit: '%' },
  { key: 'cintura_cm', label: 'Cintura', unit: 'cm' }
]

export function Progreso({ token }) {
  const { data, isLoading } = usePortalProgreso(token)
  const [metrica, setMetrica] = useState('peso_kg')

  if (isLoading) return <Loading label="Cargando progreso…" />
  if (!data || data.length === 0)
    return <Empty icon="chart-line" title="Sin mediciones" hint="Tu coach registrará tus mediciones." />

  const m = METRICAS.find((x) => x.key === metrica)
  const serie = data.filter((d) => d[metrica] != null).map((d) => ({ fecha: fechaCorta(d.fecha), v: Number(d[metrica]) }))
  const ultima = serie[serie.length - 1]
  const primera = serie[0]
  const delta = serie.length > 1 ? (ultima.v - primera.v).toFixed(1) : null

  return (
    <>
      <Overline color={colors.accent} style={{ marginBottom: space.sm }}>Tu progreso</Overline>

      {/* Selector de métrica */}
      <Row style={{ marginBottom: space.md }}>
        {METRICAS.map((x) => (
          <button
            key={x.key}
            onClick={() => setMetrica(x.key)}
            style={{
              flex: 1,
              background: metrica === x.key ? colors.surface2 : 'transparent',
              border: `0.5px solid ${metrica === x.key ? colors.accent : colors.border}`,
              borderRadius: radius.md,
              color: metrica === x.key ? colors.title : colors.muted,
              padding: '10px 0',
              cursor: 'pointer',
              fontFamily: font.family,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            {x.label}
          </button>
        ))}
      </Row>

      <Card style={{ marginBottom: space.lg }}>
        {serie.length === 0 ? (
          <div style={{ ...font.small, color: colors.muted, textAlign: 'center', padding: space.md }}>
            Sin datos de {m.label.toLowerCase()}.
          </div>
        ) : (
          <>
            <Row style={{ marginBottom: space.sm }}>
              <div style={{ flex: 1 }}>
                <Overline>{m.label} actual</Overline>
                <div style={{ ...font.big, fontSize: 36, color: colors.title }}>
                  {ultima.v}<span style={{ fontSize: 16, color: colors.muted }}> {m.unit}</span>
                </div>
              </div>
              {delta != null && (
                <div style={{ flex: 1 }}>
                  <Overline>Cambio</Overline>
                  <div style={{ ...font.big, fontSize: 36, color: delta <= 0 ? colors.accent : colors.info }}>
                    {delta > 0 ? '+' : ''}{delta}<span style={{ fontSize: 16, color: colors.muted }}> {m.unit}</span>
                  </div>
                </div>
              )}
            </Row>
            <div style={{ height: 170, marginLeft: -8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 8, right: 18, bottom: 0, left: 6 }}>
                  <XAxis dataKey="fecha" tick={{ fill: colors.hint, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fill: colors.hint, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                  <Tooltip
                    contentStyle={{ background: colors.surface2, border: `0.5px solid ${colors.border}`, borderRadius: radius.sm, color: colors.title, fontSize: 12 }}
                    labelStyle={{ color: colors.muted }}
                  />
                  <Line type="monotone" dataKey="v" stroke={colors.accent} strokeWidth={2.5} dot={{ r: 3, fill: colors.accent }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      {/* Historial */}
      <Overline style={{ marginBottom: space.sm }}>Historial</Overline>
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        {[...data].reverse().map((d) => (
          <Card key={d.id} style={{ display: 'flex', alignItems: 'center', gap: space.sm, padding: '10px 12px' }}>
            <Badge color={colors.hint} style={{ minWidth: 54, justifyContent: 'center' }}>{fechaCorta(d.fecha)}</Badge>
            <span style={{ ...font.body, color: colors.title }}>{Number(d.peso_kg)} kg</span>
            {d.grasa_pct != null && <span style={{ ...font.small, color: colors.muted }}>· {Number(d.grasa_pct)}% grasa</span>}
          </Card>
        ))}
      </div>
    </>
  )
}

function fechaCorta(f) {
  const [, m, d] = f.split('-')
  return `${d}/${m}`
}
