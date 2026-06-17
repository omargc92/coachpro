// ============================================================
// Catálogo de ejercicios (coach) — CRUD agrupado por grupo muscular.
// ============================================================
import { useState } from 'react'
import { useEjercicios, useGuardarEjercicio, useEliminarEjercicio } from '../../lib/queries.js'
import {
  Screen, Header, Card, Button, Sheet, Field, Select, Icon, Overline, Loading, Empty
} from '../../lib/ui.jsx'
import { colors, space, font } from '../../lib/theme.js'

const GRUPOS = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Cardio'].map((g) => ({
  value: g,
  label: g
}))

export function Catalogo({ coach }) {
  const { data: ejercicios, isLoading } = useEjercicios(coach)
  const [editar, setEditar] = useState(null) // objeto ejercicio o {} (nuevo) o null (cerrado)

  // agrupa por grupo_muscular
  const grupos = {}
  for (const e of ejercicios || []) (grupos[e.grupo_muscular] ||= []).push(e)

  return (
    <Screen>
      <Header
        title="Catálogo"
        subtitle="Ejercicios"
        right={
          <button
            onClick={() => setEditar({})}
            style={{ background: 'transparent', border: 'none', color: colors.accent, cursor: 'pointer', padding: 4 }}
            title="Nuevo ejercicio"
          >
            <Icon name="plus" size={24} />
          </button>
        }
      />

      {isLoading && <Loading />}
      {ejercicios && ejercicios.length === 0 && (
        <Empty
          icon="barbell"
          title="Catálogo vacío"
          hint="Agrega ejercicios para construir rutinas."
          action={<Button icon="plus" onClick={() => setEditar({})}>Nuevo ejercicio</Button>}
        />
      )}

      {Object.entries(grupos).map(([grupo, lista]) => (
        <div key={grupo} style={{ marginBottom: space.lg }}>
          <Overline style={{ marginBottom: space.sm }}>{grupo}</Overline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
            {lista.map((e) => (
              <Card
                key={e.id}
                onClick={() => setEditar(e)}
                style={{ display: 'flex', alignItems: 'center', gap: space.sm, padding: '12px 14px' }}
              >
                <Icon name="barbell" size={18} color={colors.muted} />
                <span style={{ ...font.body, color: colors.title, flex: 1 }}>{e.nombre}</span>
                <Icon name="chevron-right" size={18} color={colors.hint} />
              </Card>
            ))}
          </div>
        </div>
      ))}

      <EjercicioSheet
        open={editar !== null}
        ejercicio={editar}
        onClose={() => setEditar(null)}
        coach={coach}
      />
    </Screen>
  )
}

function EjercicioSheet({ open, ejercicio, onClose, coach }) {
  const guardar = useGuardarEjercicio(coach)
  const eliminar = useEliminarEjercicio()
  const editando = ejercicio?.id
  const [f, setF] = useState({ nombre: '', grupo_muscular: 'Pecho', gif_url: '' })
  const [key, setKey] = useState(null)

  // Re-sincroniza el formulario cuando cambia el ejercicio abierto.
  if (open && key !== (ejercicio?.id || 'nuevo')) {
    setKey(ejercicio?.id || 'nuevo')
    setF({
      nombre: ejercicio?.nombre || '',
      grupo_muscular: ejercicio?.grupo_muscular || 'Pecho',
      gif_url: ejercicio?.gif_url || ''
    })
  }
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  async function onGuardar() {
    if (!f.nombre.trim()) return
    await guardar.mutateAsync({ id: ejercicio?.id, ...f, nombre: f.nombre.trim() })
    onClose()
  }
  async function onEliminar() {
    if (!confirm(`¿Eliminar "${ejercicio.nombre}"?`)) return
    await eliminar.mutateAsync(ejercicio.id)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={editando ? 'Editar ejercicio' : 'Nuevo ejercicio'}>
      <Field label="Nombre" value={f.nombre} onChange={set('nombre')} placeholder="Ej. Press inclinado" />
      <Select label="Grupo muscular" value={f.grupo_muscular} onChange={set('grupo_muscular')} options={GRUPOS} />
      <Field label="GIF / imagen (URL)" value={f.gif_url} onChange={set('gif_url')} placeholder="Opcional" />
      <Button icon="check" onClick={onGuardar} disabled={!f.nombre.trim() || guardar.isPending}>
        {guardar.isPending ? 'Guardando…' : 'Guardar'}
      </Button>
      {editando && (
        <Button variant="danger" icon="trash" onClick={onEliminar} style={{ marginTop: space.sm }}>
          Eliminar
        </Button>
      )}
    </Sheet>
  )
}
