// ============================================================
// Rutinas (coach): lista + builder + asignación por día de semana.
// ============================================================
import { useState } from 'react'
import {
  useRutinas, useRutinaDetalle, useCrearRutina, useEliminarRutina,
  useAgregarEjercicioARutina, useActualizarRutinaEjercicio, useEliminarRutinaEjercicio,
  useReordenarRutina, useAsignarRutina, useQuitarAsignacion, useAtletasLista, useEjercicios
} from '../../lib/queries.js'
import {
  Screen, Header, Card, Button, Sheet, Field, Select, Badge, Icon, Overline, Loading, Empty, Row
} from '../../lib/ui.jsx'
import { colors, space, font, DIAS } from '../../lib/theme.js'

const DIAS_OPTS = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: String(d), label: DIAS[d] }))

export function Rutinas({ coach }) {
  const { data: rutinas, isLoading } = useRutinas(coach)
  const crear = useCrearRutina(coach)
  const [abierta, setAbierta] = useState(null) // rutinaId
  const [nueva, setNueva] = useState(false)
  const [f, setF] = useState({ nombre: '', descripcion: '' })

  if (abierta) return <RutinaBuilder coach={coach} rutinaId={abierta} onBack={() => setAbierta(null)} />

  async function crearRutina() {
    if (!f.nombre.trim()) return
    const r = await crear.mutateAsync({ nombre: f.nombre.trim(), descripcion: f.descripcion.trim() })
    setF({ nombre: '', descripcion: '' })
    setNueva(false)
    setAbierta(r.id)
  }

  return (
    <Screen>
      <Header
        title="Rutinas"
        subtitle="Builder"
        right={
          <button
            onClick={() => setNueva(true)}
            style={{ background: 'transparent', border: 'none', color: colors.accent, cursor: 'pointer', padding: 4 }}
            title="Nueva rutina"
          >
            <Icon name="plus" size={24} />
          </button>
        }
      />

      {isLoading && <Loading />}
      {rutinas && rutinas.length === 0 && (
        <Empty icon="barbell" title="Sin rutinas" hint="Crea tu primera rutina." action={<Button icon="plus" onClick={() => setNueva(true)}>Nueva rutina</Button>} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {rutinas?.map((r) => (
          <Card key={r.id} onClick={() => setAbierta(r.id)} style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="barbell" size={20} color={colors.accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...font.body, fontWeight: 600, color: colors.title }}>{r.nombre}</div>
              <div style={{ ...font.small, color: colors.muted }}>{r.num_ejercicios} ejercicios</div>
            </div>
            <Icon name="chevron-right" size={18} color={colors.hint} />
          </Card>
        ))}
      </div>

      <Sheet open={nueva} onClose={() => setNueva(false)} title="Nueva rutina">
        <Field label="Nombre" value={f.nombre} onChange={(v) => setF((p) => ({ ...p, nombre: v }))} placeholder="Ej. Full Body A" />
        <Field label="Descripción" value={f.descripcion} onChange={(v) => setF((p) => ({ ...p, descripcion: v }))} placeholder="Opcional" />
        <Button icon="check" onClick={crearRutina} disabled={!f.nombre.trim() || crear.isPending}>
          Crear y editar
        </Button>
      </Sheet>
    </Screen>
  )
}

function RutinaBuilder({ coach, rutinaId, onBack }) {
  const { data, isLoading } = useRutinaDetalle(rutinaId)
  const { data: catalogo } = useEjercicios(coach)
  const { data: atletas } = useAtletasLista(coach)
  const agregar = useAgregarEjercicioARutina(rutinaId)
  const actualizar = useActualizarRutinaEjercicio()
  const eliminar = useEliminarRutinaEjercicio()
  const reordenar = useReordenarRutina()
  const asignar = useAsignarRutina()
  const quitar = useQuitarAsignacion()
  const borrarRutina = useEliminarRutina()

  const [addOpen, setAddOpen] = useState(false)
  const [editEj, setEditEj] = useState(null)
  const [asignOpen, setAsignOpen] = useState(false)

  if (isLoading || !data) return <Screen><Loading /></Screen>
  const { rutina, ejercicios, asignaciones } = data

  function mover(idx, dir) {
    const arr = [...ejercicios]
    const j = idx + dir
    if (j < 0 || j >= arr.length) return
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    reordenar.mutate(arr.map((e, i) => ({ id: e.id, orden: i + 1 })))
  }

  async function onBorrarRutina() {
    if (!confirm(`¿Eliminar la rutina "${rutina.nombre}"?`)) return
    await borrarRutina.mutateAsync(rutina.id)
    onBack()
  }

  return (
    <Screen>
      <Header title={rutina.nombre} subtitle="Editar rutina" onBack={onBack} />

      <Overline style={{ marginBottom: space.sm }}>Ejercicios</Overline>
      {ejercicios.length === 0 && (
        <Card style={{ marginBottom: space.sm }}>
          <div style={{ ...font.small, color: colors.muted, textAlign: 'center', padding: space.sm }}>
            Agrega ejercicios desde tu catálogo.
          </div>
        </Card>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        {ejercicios.map((e, idx) => (
          <Card key={e.id} style={{ display: 'flex', alignItems: 'center', gap: space.sm, padding: '10px 12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => mover(idx, -1)} disabled={idx === 0} style={iconBtn(idx === 0)}>
                <Icon name="chevron-up" size={16} />
              </button>
              <button onClick={() => mover(idx, 1)} disabled={idx === ejercicios.length - 1} style={iconBtn(idx === ejercicios.length - 1)}>
                <Icon name="chevron-down" size={16} />
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }} onClick={() => setEditEj(e)}>
              <div style={{ ...font.body, fontWeight: 600, color: colors.title }}>{e.ejercicios?.nombre}</div>
              <div style={{ ...font.small, color: colors.muted }}>
                {e.series}×{e.reps}{e.peso_kg ? ` · ${e.peso_kg}kg` : ''} · {e.descanso_seg}s
              </div>
            </div>
            <button onClick={() => eliminar.mutate(e.id)} style={iconBtn(false, colors.danger)}>
              <Icon name="trash" size={16} />
            </button>
          </Card>
        ))}
      </div>

      <Button variant="surface" icon="plus" onClick={() => setAddOpen(true)} style={{ marginTop: space.sm, marginBottom: space.lg }}>
        Agregar ejercicio
      </Button>

      {/* --- Asignaciones --- */}
      <Overline style={{ marginBottom: space.sm }}>Asignada a</Overline>
      <Card style={{ marginBottom: space.sm }}>
        {asignaciones.length === 0 && (
          <div style={{ ...font.small, color: colors.muted, textAlign: 'center', padding: space.sm }}>
            Sin asignar. Asígnala a un atleta por día.
          </div>
        )}
        {asignaciones.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: space.sm, padding: '8px 0', borderBottom: `0.5px solid ${colors.border}` }}>
            <Badge color={colors.accent} style={{ minWidth: 42, justifyContent: 'center' }}>{DIAS[a.dia_semana]}</Badge>
            <span style={{ ...font.body, color: colors.title, flex: 1 }}>{a.atletas?.nombre}</span>
            <button onClick={() => quitar.mutate(a.id)} style={iconBtn(false, colors.danger)}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </Card>
      <Button variant="surface" icon="calendar-plus" onClick={() => setAsignOpen(true)} style={{ marginBottom: space.lg }}>
        Asignar a atleta
      </Button>

      <Button variant="danger" icon="trash" onClick={onBorrarRutina}>Eliminar rutina</Button>

      {/* Sheets (montaje condicional → estado fresco en cada apertura) */}
      {addOpen && (
        <AgregarEjercicioSheet
          onClose={() => setAddOpen(false)}
          catalogo={catalogo || []}
          orden={ejercicios.length + 1}
          onAdd={(payload) => agregar.mutate(payload)}
        />
      )}
      {editEj && (
        <EditarEjercicioSheet
          ejercicio={editEj}
          onClose={() => setEditEj(null)}
          onSave={(campos) => actualizar.mutate({ id: editEj.id, ...campos })}
        />
      )}
      {asignOpen && (
        <AsignarSheet
          onClose={() => setAsignOpen(false)}
          atletas={atletas || []}
          rutinaId={rutinaId}
          onAsignar={(payload) => asignar.mutate(payload)}
        />
      )}
    </Screen>
  )
}

function AgregarEjercicioSheet({ onClose, catalogo, orden, onAdd }) {
  const opts = catalogo.map((e) => ({ value: e.id, label: `${e.nombre} (${e.grupo_muscular})` }))
  // Se monta al abrir: arranca con el primer ejercicio del catálogo.
  const [f, setF] = useState(() => ({ ejercicio_id: opts[0]?.value || '', series: '3', reps: '10', peso_kg: '', descanso_seg: '90' }))

  function guardar() {
    if (!f.ejercicio_id) return
    onAdd({
      ejercicio_id: f.ejercicio_id,
      orden,
      series: Number(f.series) || 3,
      reps: Number(f.reps) || 10,
      peso_kg: f.peso_kg ? Number(f.peso_kg) : null,
      descanso_seg: Number(f.descanso_seg) || 90
    })
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Agregar ejercicio">
      {opts.length === 0 ? (
        <div style={{ ...font.small, color: colors.muted }}>Tu catálogo está vacío. Agrega ejercicios primero.</div>
      ) : (
        <>
          <Select label="Ejercicio" value={f.ejercicio_id} onChange={(v) => setF((p) => ({ ...p, ejercicio_id: v }))} options={opts} />
          <Row>
            <div style={{ flex: 1 }}><Field label="Series" type="number" value={f.series} onChange={(v) => setF((p) => ({ ...p, series: v }))} /></div>
            <div style={{ flex: 1 }}><Field label="Reps" type="number" value={f.reps} onChange={(v) => setF((p) => ({ ...p, reps: v }))} /></div>
          </Row>
          <Row>
            <div style={{ flex: 1 }}><Field label="Peso (kg)" type="number" value={f.peso_kg} onChange={(v) => setF((p) => ({ ...p, peso_kg: v }))} placeholder="—" /></div>
            <div style={{ flex: 1 }}><Field label="Descanso (s)" type="number" value={f.descanso_seg} onChange={(v) => setF((p) => ({ ...p, descanso_seg: v }))} /></div>
          </Row>
          <Button icon="check" onClick={guardar}>Agregar</Button>
        </>
      )}
    </Sheet>
  )
}

function EditarEjercicioSheet({ ejercicio, onClose, onSave }) {
  // Se monta al abrir con un ejercicio concreto: estado inicial directo de sus props.
  const [f, setF] = useState(() => ({
    series: String(ejercicio.series),
    reps: String(ejercicio.reps),
    peso_kg: ejercicio.peso_kg != null ? String(ejercicio.peso_kg) : '',
    descanso_seg: String(ejercicio.descanso_seg)
  }))

  function guardar() {
    onSave({
      series: Number(f.series) || 1,
      reps: Number(f.reps) || 1,
      peso_kg: f.peso_kg ? Number(f.peso_kg) : null,
      descanso_seg: Number(f.descanso_seg) || 60
    })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title={ejercicio?.ejercicios?.nombre || 'Editar'}>
      <Row>
        <div style={{ flex: 1 }}><Field label="Series" type="number" value={f.series} onChange={(v) => setF((p) => ({ ...p, series: v }))} /></div>
        <div style={{ flex: 1 }}><Field label="Reps" type="number" value={f.reps} onChange={(v) => setF((p) => ({ ...p, reps: v }))} /></div>
      </Row>
      <Row>
        <div style={{ flex: 1 }}><Field label="Peso (kg)" type="number" value={f.peso_kg} onChange={(v) => setF((p) => ({ ...p, peso_kg: v }))} placeholder="—" /></div>
        <div style={{ flex: 1 }}><Field label="Descanso (s)" type="number" value={f.descanso_seg} onChange={(v) => setF((p) => ({ ...p, descanso_seg: v }))} /></div>
      </Row>
      <Button icon="check" onClick={guardar}>Guardar</Button>
    </Sheet>
  )
}

function AsignarSheet({ onClose, atletas, rutinaId, onAsignar }) {
  const opts = atletas.map((a) => ({ value: a.id, label: a.nombre }))
  // Se monta al abrir: preselecciona el primer atleta.
  const [f, setF] = useState(() => ({ atleta_id: opts[0]?.value || '', dia_semana: '1' }))

  function guardar() {
    if (!f.atleta_id) return
    onAsignar({ atleta_id: f.atleta_id, rutina_id: rutinaId, dia_semana: Number(f.dia_semana) })
    onClose()
  }
  return (
    <Sheet open onClose={onClose} title="Asignar rutina">
      {opts.length === 0 ? (
        <div style={{ ...font.small, color: colors.muted }}>No tienes atletas todavía.</div>
      ) : (
        <>
          <Select label="Atleta" value={f.atleta_id} onChange={(v) => setF((p) => ({ ...p, atleta_id: v }))} options={opts} />
          <Select label="Día de la semana" value={f.dia_semana} onChange={(v) => setF((p) => ({ ...p, dia_semana: v }))} options={DIAS_OPTS} />
          <Button icon="check" onClick={guardar}>Asignar</Button>
        </>
      )}
    </Sheet>
  )
}

function iconBtn(disabled, color) {
  return {
    background: 'transparent',
    border: 'none',
    color: disabled ? colors.border : color || colors.muted,
    cursor: disabled ? 'default' : 'pointer',
    padding: 2,
    display: 'flex'
  }
}
