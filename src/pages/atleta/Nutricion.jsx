// ============================================================
// Portal atleta — NUTRICIÓN: macros del día, comidas por momento,
// sugerencia, foto del plato (Storage) y búsqueda (stub).
// ============================================================
import { useRef, useState } from 'react'
import { usePortalNutricion, useRegistrarComida, subirFoto, todayISO } from '../../lib/queries.js'
import {
  Card, Ring, Bar, Overline, Button, Sheet, Field, Select, Icon, Badge, Loading, Empty, Row
} from '../../lib/ui.jsx'
import { colors, space, font, radius, MOMENTO_LABEL } from '../../lib/theme.js'

const MOMENTOS = Object.entries(MOMENTO_LABEL).map(([value, label]) => ({ value, label }))

export function Nutricion({ token, autoFoto }) {
  const hoy = todayISO()
  const { data, isLoading } = usePortalNutricion(token, hoy)
  const registrar = useRegistrarComida(token)
  const [open, setOpen] = useState(false)
  const [fotoPreseleccion, setFotoPreseleccion] = useState(null)
  const fileRef = useRef(null)

  if (isLoading) return <Loading label="Cargando nutrición…" />

  const objetivo = data?.objetivo
  const consumido = data?.consumido || { kcal: 0, proteina_g: 0, carbos_g: 0, grasas_g: 0 }
  const comidas = data?.comidas || []

  if (!objetivo)
    return <Empty icon="salad" title="Sin metas de nutrición" hint="Tu coach aún no define tus macros." />

  const protPct = objetivo.proteina_g ? Math.min(100, Math.round((consumido.proteina_g / objetivo.proteina_g) * 100)) : 0
  const restKcal = Math.max(0, objetivo.kcal - consumido.kcal)
  const restProt = Math.max(0, objetivo.proteina_g - consumido.proteina_g)

  const porMomento = {}
  for (const c of comidas) (porMomento[c.momento] ||= []).push(c)

  function abrirCamara() {
    setFotoPreseleccion(null)
    fileRef.current?.click()
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const url = await subirFoto(file, 'platos')
      setFotoPreseleccion(url)
      setOpen(true)
    } catch (err) {
      alert('No se pudo subir la foto: ' + (err.message || err))
    }
  }

  return (
    <>
      {/* Proteína protagonista (en lima) */}
      <div style={{ textAlign: 'center', marginBottom: space.md }}>
        <Overline color={colors.accent}>Proteína de hoy</Overline>
        <div style={{ marginTop: space.sm }}>
          <Ring value={protPct} label={`${consumido.proteina_g} / ${objetivo.proteina_g} g`} size={180} />
        </div>
      </div>

      {/* Macros restantes */}
      <Card style={{ marginBottom: space.md, display: 'flex', flexDirection: 'column', gap: space.md }}>
        <MacroLinea label="Calorías" v={consumido.kcal} m={objetivo.kcal} unit="kcal" color={colors.info} />
        <MacroLinea label="Proteína" v={consumido.proteina_g} m={objetivo.proteina_g} unit="g" color={colors.accent} />
        <MacroLinea label="Carbos" v={consumido.carbos_g} m={objetivo.carbos_g} unit="g" color={colors.muted} />
        <MacroLinea label="Grasas" v={consumido.grasas_g} m={objetivo.grasas_g} unit="g" color={colors.muted} />
      </Card>

      {/* Sugerencia */}
      <Card accent={colors.border} style={{ marginBottom: space.lg, display: 'flex', gap: space.sm, alignItems: 'flex-start' }}>
        <Icon name="bulb" size={20} color={colors.accent} style={{ marginTop: 2 }} />
        <div style={{ ...font.small, color: colors.body }}>
          {restKcal > 0
            ? <>Te quedan <b style={{ color: colors.title }}>{restKcal} kcal</b> y <b style={{ color: colors.accent }}>{restProt} g</b> de proteína para hoy.</>
            : <>Llegaste a tu meta de calorías. Cuida los excesos el resto del día.</>}
        </div>
      </Card>

      {/* Comidas por momento */}
      <Overline style={{ marginBottom: space.sm }}>Comidas de hoy</Overline>
      {comidas.length === 0 && <Empty icon="bowl" title="Sin comidas registradas" hint="Agrega tu primera comida." />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.md }}>
        {MOMENTOS.filter((m) => porMomento[m.value]).map((m) => (
          <div key={m.value}>
            <div style={{ ...font.small, color: colors.muted, marginBottom: 6, fontWeight: 600 }}>{m.label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
              {porMomento[m.value].map((c) => (
                <Card key={c.id} style={{ display: 'flex', gap: space.sm, alignItems: 'center', padding: '10px 12px' }}>
                  {c.foto_url ? (
                    <img src={c.foto_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="bowl" size={20} color={colors.hint} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...font.body, color: colors.title }}>{c.descripcion || 'Comida'}</div>
                    <div style={{ ...font.small, color: colors.muted }}>
                      {c.kcal} kcal · {c.proteina_g}g P
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <Row style={{ marginTop: space.lg }}>
        <Button icon="camera" onClick={abrirCamara} style={{ flex: 1 }}>Foto del plato</Button>
        <Button variant="surface" icon="plus" onClick={() => { setFotoPreseleccion(null); setOpen(true) }} style={{ flex: 1 }}>
          Agregar
        </Button>
      </Row>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />

      <ComidaSheet
        open={open}
        onClose={() => setOpen(false)}
        foto={fotoPreseleccion}
        onGuardar={(c) => registrar.mutate({ ...c, fecha: hoy })}
        guardando={registrar.isPending}
      />
    </>
  )
}

function MacroLinea({ label, v, m, unit, color }) {
  const pct = m ? Math.min(100, Math.round((v / m) * 100)) : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <Overline>{label}</Overline>
        <span style={{ ...font.small, color: colors.muted }}>
          <span style={{ color: colors.title, fontWeight: 600 }}>{v}</span> / {m} {unit}
        </span>
      </div>
      <Bar value={pct} color={color} />
    </div>
  )
}

function ComidaSheet({ open, onClose, foto, onGuardar, guardando }) {
  const vacio = { momento: 'comida', descripcion: '', kcal: '', proteina_g: '', carbos_g: '', grasas_g: '' }
  const [f, setF] = useState(vacio)
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  function guardar() {
    onGuardar({
      momento: f.momento,
      descripcion: f.descripcion.trim() || null,
      kcal: Number(f.kcal) || 0,
      proteina_g: Number(f.proteina_g) || 0,
      carbos_g: Number(f.carbos_g) || 0,
      grasas_g: Number(f.grasas_g) || 0,
      foto_url: foto || null
    })
    setF(vacio)
    onClose()
  }

  // Búsqueda manual (stub): integrar luego Open Food Facts / USDA.
  function buscar() {
    alert('Búsqueda de alimentos: próximamente (Open Food Facts / USDA).')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Agregar comida">
      {foto && (
        <img src={foto} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: radius.md, marginBottom: space.md }} />
      )}
      <Select label="Momento" value={f.momento} onChange={set('momento')} options={MOMENTOS} />
      <Field label="Descripción" value={f.descripcion} onChange={set('descripcion')} placeholder="Ej. Pollo con arroz" />

      <Button variant="ghost" icon="search" onClick={buscar} style={{ marginBottom: space.md }}>
        Buscar alimento (próximamente)
      </Button>

      <Row>
        <div style={{ flex: 1 }}><Field label="Kcal" type="number" value={f.kcal} onChange={set('kcal')} placeholder="0" /></div>
        <div style={{ flex: 1 }}><Field label="Proteína (g)" type="number" value={f.proteina_g} onChange={set('proteina_g')} placeholder="0" /></div>
      </Row>
      <Row>
        <div style={{ flex: 1 }}><Field label="Carbos (g)" type="number" value={f.carbos_g} onChange={set('carbos_g')} placeholder="0" /></div>
        <div style={{ flex: 1 }}><Field label="Grasas (g)" type="number" value={f.grasas_g} onChange={set('grasas_g')} placeholder="0" /></div>
      </Row>
      <div style={{ ...font.small, color: colors.hint, marginBottom: space.md }}>
        Los macros los valida tu coach. La foto se guarda sin estimación automática por ahora.
      </div>
      <Button icon="check" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar comida'}
      </Button>
    </Sheet>
  )
}
