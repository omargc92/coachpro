// ============================================================
// Home del COACH — stats + lista de atletas ordenada por Score.
// ============================================================
import { useState } from 'react'
import { useAuth } from '../../lib/auth.jsx'
import { useAtletasResumen, useCrearAtleta } from '../../lib/queries.js'
import {
  Screen, Header, Card, Row, Stat, Avatar, Badge, Button, Sheet, Field, Select,
  Icon, Overline, Loading, Empty
} from '../../lib/ui.jsx'
import { colors, space, font, radius, scoreColor, OBJETIVO_LABEL } from '../../lib/theme.js'
import { usePlan } from '../../lib/usePlan.jsx'
import { PLANS } from '../../lib/plans.js'

const OBJETIVOS = Object.entries(OBJETIVO_LABEL).map(([value, label]) => ({ value, label }))

export function Atletas({ coach, onOpenAtleta, onOpenCatalogo }) {
  const { signOut } = useAuth()
  const { data: atletas, isLoading, error } = useAtletasResumen(coach)
  const { canWrite, isReadOnly, canAddAthlete, plan } = usePlan()
  const [nuevo, setNuevo] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const total = atletas?.length || 0
  const enGym = atletas?.filter((a) => a.asistioHoy).length || 0
  const enRiesgo = atletas?.filter((a) => a.enRiesgo).length || 0

  function handleNuevoAtleta() {
    if (!canWrite) { setUpgradeOpen(true); return }
    if (!canAddAthlete(total)) { setUpgradeOpen(true); return }
    setNuevo(true)
  }

  return (
    <Screen>
      <Header
        title="Atletas"
        subtitle={`Hola, ${coach.nombre}`}
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={onOpenCatalogo}
              style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4 }}
              title="Catálogo de ejercicios"
            >
              <Icon name="barbell" size={22} />
            </button>
            <button
              onClick={() => signOut()}
              style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4 }}
              title="Cerrar sesión"
            >
              <Icon name="logout-2" size={22} />
            </button>
          </div>
        }
      />

      {isReadOnly && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,120,71,0.08)', border: `0.5px solid ${colors.danger}`,
          borderRadius: radius.md, padding: `${space.sm}px ${space.md}px`, marginBottom: space.md
        }}>
          <Icon name="lock" size={16} color={colors.danger} />
          <span style={{ ...font.small, color: colors.danger }}>Modo lectura — reactiva tu plan para editar</span>
        </div>
      )}

      <Row style={{ marginBottom: space.md }}>
        <Stat label="Atletas" value={total} />
        <Stat label="Hoy en gym" value={enGym} accent={colors.accent} />
        <Stat label="En riesgo" value={enRiesgo} accent={enRiesgo ? colors.danger : colors.title} />
      </Row>

      <Button
        icon="user-plus"
        onClick={handleNuevoAtleta}
        variant={isReadOnly || !canAddAthlete(total) ? 'ghost' : 'primary'}
        style={{ marginBottom: space.lg }}
      >
        Nuevo atleta
      </Button>

      {/* Modal de upgrade */}
      {upgradeOpen && (
        <UpgradeSheet
          onClose={() => setUpgradeOpen(false)}
          isReadOnly={isReadOnly}
          plan={plan}
          maxAthletes={PLANS[plan]?.maxAthletes}
        />
      )}

      {isLoading && <Loading label="Cargando atletas…" />}
      {error && <Empty icon="alert-triangle" title="Error al cargar" hint={String(error.message || error)} />}
      {atletas && total === 0 && (
        <Empty icon="users" title="Sin atletas todavía" hint="Agrega tu primer atleta para empezar." />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {atletas?.map((a) => (
          <AtletaCard key={a.id} a={a} onClick={() => onOpenAtleta(a.id)} />
        ))}
      </div>

      <NuevoAtletaSheet open={nuevo} onClose={() => setNuevo(false)} coach={coach} />
    </Screen>
  )
}

function AtletaCard({ a, onClick }) {
  const col = scoreColor(a.score)
  return (
    <Card onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: space.md }}>
      <Avatar nombre={a.nombre} size={46} color={colors.body} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...font.body, fontSize: 15.5, fontWeight: 700, color: colors.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.nombre}
          </span>
          {a.enRiesgo && (
            <Badge color={colors.danger} style={{ flexShrink: 0 }}>
              <Icon name="alert-triangle" size={11} /> {a.diasSinRegistro}d
            </Badge>
          )}
        </div>
        <div style={{ ...font.small, color: colors.muted, marginTop: 3 }}>
          {OBJETIVO_LABEL[a.objetivo]} · Semana {a.semana}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ ...font.number, fontSize: 30, color: col, lineHeight: 1 }}>{a.score}</div>
        <Overline style={{ fontSize: 9, marginTop: 2 }}>Score</Overline>
      </div>
    </Card>
  )
}

function UpgradeSheet({ onClose, isReadOnly, plan, maxAthletes }) {
  return (
    <Sheet open onClose={onClose} title="Límite alcanzado">
      <div style={{ textAlign: 'center', padding: `${space.md}px 0` }}>
        <Icon name="crown" size={40} color={colors.accent} />
        <div style={{ ...font.title, color: colors.title, marginTop: space.md }}>
          {isReadOnly
            ? 'Tu periodo de prueba terminó'
            : `Límite de tu plan ${plan}`}
        </div>
        <div style={{ ...font.small, color: colors.muted, marginTop: 8 }}>
          {isReadOnly
            ? 'Reactiva tu plan para seguir creando y editando atletas.'
            : `Tu plan actual permite hasta ${maxAthletes} atletas. Mejora para agregar más.`}
        </div>
      </div>
      <Button icon="crown" onClick={onClose} style={{ marginTop: space.md }}>
        Ver planes
      </Button>
    </Sheet>
  )
}

function NuevoAtletaSheet({ open, onClose, coach }) {
  const crear = useCrearAtleta(coach)
  const [f, setF] = useState({ nombre: '', telefono: '', objetivo: 'mantenimiento', fecha_nacimiento: '', notas: '' })
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  async function guardar() {
    if (!f.nombre.trim()) return
    await crear.mutateAsync({
      nombre: f.nombre.trim(),
      telefono: f.telefono.trim() || null,
      objetivo: f.objetivo,
      fecha_nacimiento: f.fecha_nacimiento || null,
      notas: f.notas.trim() || null
    })
    setF({ nombre: '', telefono: '', objetivo: 'mantenimiento', fecha_nacimiento: '', notas: '' })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nuevo atleta">
      <Field label="Nombre" value={f.nombre} onChange={set('nombre')} placeholder="Nombre y apellido" />
      <Field label="Fecha de nacimiento" type="date" value={f.fecha_nacimiento} onChange={set('fecha_nacimiento')} />
      <Field label="Teléfono" value={f.telefono} onChange={set('telefono')} placeholder="Opcional" />
      <Select label="Objetivo" value={f.objetivo} onChange={set('objetivo')} options={OBJETIVOS} />
      <Field label="Notas" value={f.notas} onChange={set('notas')} placeholder="Opcional" />
      <Button icon="check" onClick={guardar} disabled={!f.nombre.trim() || crear.isPending}>
        {crear.isPending ? 'Guardando…' : 'Crear atleta'}
      </Button>
    </Sheet>
  )
}
