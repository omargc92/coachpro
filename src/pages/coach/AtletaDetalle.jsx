// ============================================================
// Detalle de atleta (coach): mediciones, rutina, nutrición,
// asistencias y link del portal.
// ============================================================
import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'
import {
  useAtleta, useMediciones, useAsignacionesAtleta, useAtletaActividad, useGuardarObjetivoNutricion
} from '../../lib/queries.js'
import {
  Screen, Header, Card, Row, Overline, Bar, Button, Badge, Icon, Loading, Empty, Sheet, Field
} from '../../lib/ui.jsx'
import { colors, space, font, radius, OBJETIVO_LABEL, DIAS } from '../../lib/theme.js'
import { usePlan } from '../../lib/usePlan.jsx'

export function AtletaDetalle({ atletaId, onBack, coach }) {
  const { data: at, isLoading } = useAtleta(atletaId)
  const { data: med } = useMediciones(atletaId)
  const { data: asign } = useAsignacionesAtleta(atletaId)
  const { data: act } = useAtletaActividad(atletaId)
  const guardarObjetivo = useGuardarObjetivoNutricion(atletaId)
  const { hasFeature } = usePlan()
  const [copiado, setCopiado]         = useState(false)
  const [editObjetivo, setEditObjetivo] = useState(false)
  const [exportando, setExportando]   = useState(false)

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

  async function handleExportPDF() {
    setExportando(true)
    try {
      const { exportarProgresoPDF } = await import('../../lib/exportPdf.js')
      await exportarProgresoPDF({ atleta: at, mediciones: med ?? [], actividad: act, coach })
    } catch (err) {
      alert('Error al generar PDF: ' + (err.message || err))
    } finally {
      setExportando(false)
    }
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

      {/* --- Nutrición hoy --- (título en su propia línea; acción apilada debajo) */}
      <SeccionTitulo>Adherencia nutricional · hoy</SeccionTitulo>
      <Button
        variant="surface"
        icon="adjustments"
        onClick={() => setEditObjetivo(true)}
        style={{ marginBottom: space.sm }}
      >
        {act?.objetivo ? 'Editar metas' : 'Definir metas'}
      </Button>
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

      {/* --- Export PDF (Premium) --- */}
      {hasFeature('exportPdf')
        ? (
          <Button
            variant="ghost"
            icon={exportando ? 'loader-2' : 'file-type-pdf'}
            onClick={handleExportPDF}
            disabled={exportando}
            style={{ marginBottom: space.sm }}
          >
            {exportando ? 'Generando PDF…' : 'Exportar progreso PDF'}
          </Button>
        )
        : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: colors.surface, border: `0.5px solid ${colors.border}`,
            borderRadius: radius.md, padding: `${space.sm}px ${space.md}px`,
            marginBottom: space.sm
          }}>
            <Icon name="lock" size={15} color={colors.hint} />
            <span style={{ ...font.small, color: colors.muted }}>Export PDF disponible en plan Premium</span>
          </div>
        )
      }

      {/* --- Chat (fase 4) --- */}
      <Button variant="ghost" icon="message-circle" disabled>
        Abrir chat (Fase 4)
      </Button>

      {editObjetivo && (
        <ObjetivoSheet
          onClose={() => setEditObjetivo(false)}
          objetivo={act?.objetivo}
          onGuardar={(metas) =>
            guardarObjetivo.mutate(metas, { onSuccess: () => setEditObjetivo(false) })
          }
          guardando={guardarObjetivo.isPending}
        />
      )}
    </Screen>
  )
}

// Sheet para que el coach defina/edite los macros objetivo del atleta.
// Se monta al abrir, así que el estado inicial sale del objetivo vigente.
function ObjetivoSheet({ onClose, objetivo, onGuardar, guardando }) {
  const [f, setF] = useState(() => ({
    kcal: objetivo?.kcal != null ? String(objetivo.kcal) : '',
    proteina_g: objetivo?.proteina_g != null ? String(objetivo.proteina_g) : '',
    carbos_g: objetivo?.carbos_g != null ? String(objetivo.carbos_g) : '',
    grasas_g: objetivo?.grasas_g != null ? String(objetivo.grasas_g) : ''
  }))
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  return (
    <Sheet open onClose={onClose} title="Objetivos de nutrición">
      <div style={{ ...font.small, color: colors.hint, marginBottom: space.md }}>
        Metas diarias del atleta. Aplican desde hoy.
      </div>
      <Row>
        <div style={{ flex: 1 }}><Field label="Kcal" type="number" value={f.kcal} onChange={set('kcal')} placeholder="0" /></div>
        <div style={{ flex: 1 }}><Field label="Proteína (g)" type="number" value={f.proteina_g} onChange={set('proteina_g')} placeholder="0" /></div>
      </Row>
      <Row>
        <div style={{ flex: 1 }}><Field label="Carbos (g)" type="number" value={f.carbos_g} onChange={set('carbos_g')} placeholder="0" /></div>
        <div style={{ flex: 1 }}><Field label="Grasas (g)" type="number" value={f.grasas_g} onChange={set('grasas_g')} placeholder="0" /></div>
      </Row>
      <Button icon="check" onClick={() => onGuardar(f)} disabled={guardando || !(Number(f.kcal) > 0)}>
        {guardando ? 'Guardando…' : 'Guardar objetivos'}
      </Button>
    </Sheet>
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
          <LineChart data={data} margin={{ top: 8, right: 18, bottom: 0, left: 6 }}>
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
