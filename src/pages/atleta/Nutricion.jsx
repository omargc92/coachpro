// ============================================================
// Portal atleta — NUTRICIÓN: macros del día, comidas por momento,
// sugerencia, foto del plato (Storage) y búsqueda (stub).
// ============================================================
import { useRef, useState } from 'react'
import { usePortalNutricion, useRegistrarComida, subirFoto, todayISO } from '../../lib/queries.js'
import { buscarAlimentos, escalarMacros } from '../../lib/foods.js'
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
  const [buscando, setBuscando] = useState(false)
  const [estimando, setEstimando] = useState(false)
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }))

  function cerrar() {
    setF(vacio)
    setBuscando(false)
    setEstimando(false)
    onClose()
  }

  // Estima macros desde la foto vía /api/estimar-macros (Claude visión).
  async function estimarConIA() {
    if (!foto || estimando) return
    setEstimando(true)
    try {
      const res = await fetch('/api/estimar-macros', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ imageUrl: foto })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo estimar')
      setF((p) => ({
        ...p,
        descripcion: p.descripcion || data.descripcion || '',
        kcal: String(data.kcal ?? ''),
        proteina_g: String(data.proteina_g ?? ''),
        carbos_g: String(data.carbos_g ?? ''),
        grasas_g: String(data.grasas_g ?? '')
      }))
    } catch (e) {
      alert('No se pudo estimar con IA: ' + (e.message || e))
    } finally {
      setEstimando(false)
    }
  }

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
    cerrar()
  }

  // Aplica un alimento elegido en el buscador: rellena descripción y macros.
  function aplicarAlimento({ nombre, gramos, macros }) {
    setF((p) => ({
      ...p,
      descripcion: gramos === 100 ? nombre : `${nombre} (${gramos} g)`,
      kcal: String(macros.kcal),
      proteina_g: String(macros.proteina_g),
      carbos_g: String(macros.carbos_g),
      grasas_g: String(macros.grasas_g)
    }))
    setBuscando(false)
  }

  if (buscando)
    return (
      <Sheet open={open} onClose={cerrar} title="Buscar alimento">
        <BuscadorAlimentos onElegir={aplicarAlimento} onCancelar={() => setBuscando(false)} />
      </Sheet>
    )

  return (
    <Sheet open={open} onClose={cerrar} title="Agregar comida">
      {foto && (
        <>
          <img src={foto} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: radius.md, marginBottom: space.sm }} />
          <Button variant="surface" icon="sparkles" onClick={estimarConIA} disabled={estimando} style={{ marginBottom: space.md }}>
            {estimando ? 'Estimando…' : 'Estimar macros con IA'}
          </Button>
        </>
      )}
      <Select label="Momento" value={f.momento} onChange={set('momento')} options={MOMENTOS} />
      <Field label="Descripción" value={f.descripcion} onChange={set('descripcion')} placeholder="Ej. Pollo con arroz" />

      <Button variant="ghost" icon="search" onClick={() => setBuscando(true)} style={{ marginBottom: space.md }}>
        Buscar alimento
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
        Búsqueda (Open Food Facts) y estimación por foto (IA) son orientativas; tu coach valida los macros.
      </div>
      <Button icon="check" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar comida'}
      </Button>
    </Sheet>
  )
}

// Buscador de alimentos: query → lista → elegir cantidad → devolver macros.
function BuscadorAlimentos({ onElegir, onCancelar }) {
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('idle') // idle | cargando | ok | error
  const [resultados, setResultados] = useState([])
  const [sel, setSel] = useState(null) // alimento elegido (para fijar cantidad)
  const [gramos, setGramos] = useState('100')

  async function ejecutar() {
    if (!q.trim()) return
    setEstado('cargando')
    setSel(null)
    try {
      const r = await buscarAlimentos(q)
      setResultados(r)
      setEstado('ok')
    } catch {
      setEstado('error')
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      ejecutar()
    }
  }

  // Paso 2: cantidad para el alimento seleccionado.
  if (sel) {
    const macros = escalarMacros(sel.per100, gramos)
    return (
      <>
        <div style={{ ...font.body, color: colors.title, marginBottom: 2 }}>{sel.nombre}</div>
        {sel.marca && <div style={{ ...font.small, color: colors.muted, marginBottom: space.md }}>{sel.marca}</div>}
        <Field label="Cantidad (g)" type="number" value={gramos} onChange={setGramos} placeholder="100" />
        <Card style={{ marginBottom: space.md, display: 'flex', justifyContent: 'space-between', ...font.small, color: colors.body }}>
          <span><b style={{ color: colors.info }}>{macros.kcal}</b> kcal</span>
          <span><b style={{ color: colors.accent }}>{macros.proteina_g}</b> P</span>
          <span><b style={{ color: colors.title }}>{macros.carbos_g}</b> C</span>
          <span><b style={{ color: colors.title }}>{macros.grasas_g}</b> G</span>
        </Card>
        <Row>
          <Button variant="surface" icon="arrow-left" onClick={() => setSel(null)} style={{ flex: 1 }}>Volver</Button>
          <Button
            icon="check"
            onClick={() => onElegir({ nombre: sel.nombre, gramos: Number(gramos) || 0, macros })}
            disabled={!(Number(gramos) > 0)}
            style={{ flex: 1 }}
          >
            Usar
          </Button>
        </Row>
      </>
    )
  }

  // Paso 1: búsqueda + lista.
  return (
    <>
      <Field label="" value={q} onChange={setQ} onKeyDown={onKeyDown} placeholder="Ej. yogur griego" />
      <Button icon="search" onClick={ejecutar} disabled={estado === 'cargando' || !q.trim()} style={{ marginBottom: space.md }}>
        Buscar
      </Button>

      {estado === 'cargando' && <Loading label="Buscando…" />}
      {estado === 'error' && (
        <Empty icon="wifi-off" title="No se pudo buscar" hint="Revisa tu conexión e inténtalo de nuevo." />
      )}
      {estado === 'ok' && resultados.length === 0 && (
        <Empty icon="search-off" title="Sin resultados" hint="Prueba con otro nombre o más general." />
      )}

      {resultados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs, marginBottom: space.md }}>
          {resultados.map((a, i) => (
            <Card key={i} onClick={() => { setGramos('100'); setSel(a) }} style={{ padding: '10px 12px' }}>
              <div style={{ ...font.body, color: colors.title }}>{a.nombre}</div>
              <div style={{ ...font.small, color: colors.muted }}>
                {a.marca ? `${a.marca} · ` : ''}{a.per100.kcal} kcal · {a.per100.prot}g P / 100 g
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button variant="ghost" icon="arrow-left" onClick={onCancelar}>Volver a entrada manual</Button>
    </>
  )
}
