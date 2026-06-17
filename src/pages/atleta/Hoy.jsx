// ============================================================
// Portal atleta — HOY: Score de Disciplina (protagonista), racha,
// mini-stats y registro de sets a un toque.
// ============================================================
import { useState } from 'react'
import {
  usePerfilYRutina, usePortalSesionHoy, usePortalNutricion, usePortalHistorial,
  useRegistrarSet, useMarcarAsistencia, todayISO
} from '../../lib/queries.js'
import {
  Card, Ring, Overline, Button, Sheet, Field, Select, Icon, Badge, Loading, Empty, Row
} from '../../lib/ui.jsx'
import { colors, space, font, radius, scoreColor, SCORE_STREAK_UMBRAL } from '../../lib/theme.js'
import { scoreDia, calcularRacha } from '../../lib/score.js'

export function Hoy({ token, onIrNutricion }) {
  const hoy = todayISO()
  const perfilQ = usePerfilYRutina(token, hoy)
  const sesionQ = usePortalSesionHoy(token, hoy)
  const nutriQ = usePortalNutricion(token, hoy)
  const histQ = usePortalHistorial(token, 30)
  const registrar = useRegistrarSet(token)
  const asistir = useMarcarAsistencia(token)
  const [registrarOpen, setRegistrarOpen] = useState(false)

  if (perfilQ.isLoading) return <Loading label="Cargando tu día…" />
  if (perfilQ.error)
    return <Empty icon="alert-triangle" title="Link inválido" hint="Pide a tu coach un nuevo enlace." />

  const { atleta, rutina, asistio_hoy } = perfilQ.data
  const sets = sesionQ.data || []
  const nutri = nutriQ.data

  // sets completados por ejercicio (hoy)
  const hechosPorEj = {}
  for (const s of sets) if (s.completada) hechosPorEj[s.ejercicio_id] = (hechosPorEj[s.ejercicio_id] || 0) + 1

  const setsPlaneados = rutina?.ejercicios?.reduce((a, e) => a + (e.series || 0), 0) || 0
  const setsHechos = Object.values(hechosPorEj).reduce((a, n) => a + n, 0)

  const objetivo = nutri?.objetivo || null
  const consumido = nutri?.consumido || null

  const score = scoreDia({ asistioHoy: asistio_hoy, setsPlaneados, setsHechos, objetivo, consumido })

  // racha a partir del historial (con el score de hoy en vivo)
  const scoresMap = {}
  for (const d of histQ.data || [])
    scoresMap[d.fecha] = scoreDia({
      asistioHoy: d.asistio,
      setsPlaneados: d.sets_planeados,
      setsHechos: d.sets_hechos,
      objetivo: d.kcal_meta ? { kcal: d.kcal_meta, proteina_g: d.prot_meta } : null,
      consumido: d.kcal_meta ? { kcal: d.kcal_cons, proteina_g: d.prot_cons } : null
    }).total
  scoresMap[hoy] = score.total
  const racha = calcularRacha(scoresMap, hoy)

  const comidaPct = objetivo?.proteina_g
    ? Math.min(100, Math.round(((consumido?.proteina_g || 0) / objetivo.proteina_g) * 100))
    : null

  function registrarSerie(ej) {
    const hechos = hechosPorEj[ej.ejercicio_id] || 0
    if (hechos >= ej.series) return
    registrar.mutate({
      ejercicio_id: ej.ejercicio_id,
      serie_num: hechos + 1,
      reps: ej.reps,
      peso: ej.peso_kg,
      rutina_id: rutina.rutina_id,
      fecha: hoy
    })
  }

  return (
    <>
      {/* Score protagonista */}
      <div style={{ textAlign: 'center', marginBottom: space.md }}>
        <Overline color={colors.accent}>Hola, {atleta.nombre.split(' ')[0]}</Overline>
        <div style={{ marginTop: space.sm }}>
          <Ring value={score.total} label="Score de disciplina" />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: space.sm }}>
          <Icon name="flame" size={20} color={racha > 0 ? colors.danger : colors.hint} />
          <span style={{ ...font.number, fontSize: 18, color: racha > 0 ? colors.title : colors.muted }}>
            {racha}
          </span>
          <span style={{ ...font.small, color: colors.muted }}>
            {racha === 1 ? 'día' : 'días'} de racha (≥{SCORE_STREAK_UMBRAL})
          </span>
        </div>
      </div>

      {/* Mini-stats */}
      <Row style={{ marginBottom: space.lg }}>
        <MiniStat
          icon={asistio_hoy ? 'circle-check' : 'circle'}
          color={asistio_hoy ? colors.accent : colors.hint}
          label="Asistencia"
          value={asistio_hoy ? '✓' : '—'}
        />
        <MiniStat icon="barbell" color={colors.title} label="Rutina" value={`${setsHechos}/${setsPlaneados}`} />
        <MiniStat
          icon="flame"
          color={colors.title}
          label="Comida"
          value={comidaPct != null ? `${comidaPct}%` : '—'}
        />
      </Row>

      {/* Asistencia */}
      {!asistio_hoy && (
        <Button icon="map-pin-check" onClick={() => asistir.mutate(hoy)} style={{ marginBottom: space.lg }}>
          {asistir.isPending ? 'Registrando…' : 'Marcar asistencia de hoy'}
        </Button>
      )}

      {/* Rutina del día */}
      <Overline style={{ marginBottom: space.sm }}>
        {rutina ? `Rutina · ${rutina.nombre}` : 'Hoy'}
      </Overline>

      {!rutina && (
        <Empty icon="zzz" title="Día de descanso" hint="No tienes rutina asignada hoy. ¡Recupera!" />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {rutina?.ejercicios?.map((ej) => {
          const hechos = hechosPorEj[ej.ejercicio_id] || 0
          const completo = hechos >= ej.series
          return (
            <Card key={ej.rutina_ejercicio_id} accent={completo ? colors.accent : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...font.body, fontWeight: 600, color: colors.title }}>{ej.nombre}</div>
                  <div style={{ ...font.small, color: colors.muted }}>
                    {ej.series}×{ej.reps}{ej.peso_kg ? ` · ${ej.peso_kg}kg` : ''}
                  </div>
                </div>
                {completo && <Icon name="circle-check" size={22} color={colors.accent} />}
              </div>

              {/* Dots de series — toca para registrar */}
              <div style={{ display: 'flex', gap: 8, marginTop: space.sm, flexWrap: 'wrap' }}>
                {Array.from({ length: ej.series }).map((_, i) => {
                  const done = i < hechos
                  const siguiente = i === hechos
                  return (
                    <button
                      key={i}
                      onClick={() => siguiente && registrarSerie(ej)}
                      disabled={!siguiente || registrar.isPending}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: `0.5px solid ${done ? colors.accent : colors.border}`,
                        background: done ? colors.accent : 'transparent',
                        color: done ? colors.accentInk : siguiente ? colors.accent : colors.hint,
                        cursor: siguiente ? 'pointer' : 'default',
                        fontWeight: 600,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {done ? <Icon name="check" size={16} /> : i + 1}
                    </button>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Acciones */}
      <Row style={{ marginTop: space.lg }}>
        <Button icon="plus" onClick={() => setRegistrarOpen(true)} style={{ flex: 2 }} disabled={!rutina}>
          Registrar serie
        </Button>
        <Button variant="surface" icon="camera" onClick={onIrNutricion} style={{ flex: 1 }}>
          Foto
        </Button>
      </Row>

      <RegistrarSerieSheet
        open={registrarOpen}
        onClose={() => setRegistrarOpen(false)}
        rutina={rutina}
        hechosPorEj={hechosPorEj}
        onRegistrar={(payload) => registrar.mutate({ ...payload, rutina_id: rutina.rutina_id, fecha: hoy })}
      />
    </>
  )
}

function MiniStat({ icon, color, label, value }) {
  return (
    <Card style={{ flex: 1, textAlign: 'center', padding: '14px 8px' }}>
      <Icon name={icon} size={20} color={color} />
      <div style={{ ...font.number, fontSize: 20, color: colors.title, marginTop: 4 }}>{value}</div>
      <Overline style={{ fontSize: 9, marginTop: 2 }}>{label}</Overline>
    </Card>
  )
}

function RegistrarSerieSheet({ open, onClose, rutina, hechosPorEj, onRegistrar }) {
  const [f, setF] = useState({ ejercicio_id: '', reps: '', peso: '' })
  const opts = (rutina?.ejercicios || []).map((e) => ({ value: e.ejercicio_id, label: e.nombre }))

  if (open && !f.ejercicio_id && opts.length) {
    const first = rutina.ejercicios[0]
    setF({ ejercicio_id: first.ejercicio_id, reps: String(first.reps), peso: first.peso_kg != null ? String(first.peso_kg) : '' })
  }

  const ejSel = rutina?.ejercicios?.find((e) => e.ejercicio_id === f.ejercicio_id)

  function elegir(id) {
    const e = rutina.ejercicios.find((x) => x.ejercicio_id === id)
    setF({ ejercicio_id: id, reps: String(e.reps), peso: e.peso_kg != null ? String(e.peso_kg) : '' })
  }

  function guardar() {
    if (!ejSel) return
    const hechos = hechosPorEj[ejSel.ejercicio_id] || 0
    onRegistrar({
      ejercicio_id: ejSel.ejercicio_id,
      serie_num: hechos + 1,
      reps: Number(f.reps) || ejSel.reps,
      peso: f.peso ? Number(f.peso) : null
    })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar serie">
      {opts.length === 0 ? (
        <div style={{ ...font.small, color: colors.muted }}>No hay rutina hoy.</div>
      ) : (
        <>
          <Select label="Ejercicio" value={f.ejercicio_id} onChange={elegir} options={opts} />
          {ejSel && (
            <Badge color={colors.muted} style={{ marginBottom: space.md }}>
              Serie {(hechosPorEj[ejSel.ejercicio_id] || 0) + 1} de {ejSel.series}
            </Badge>
          )}
          <Row>
            <div style={{ flex: 1 }}><Field label="Reps" type="number" value={f.reps} onChange={(v) => setF((p) => ({ ...p, reps: v }))} /></div>
            <div style={{ flex: 1 }}><Field label="Peso (kg)" type="number" value={f.peso} onChange={(v) => setF((p) => ({ ...p, peso: v }))} placeholder="—" /></div>
          </Row>
          <Button icon="check" onClick={guardar}>Registrar</Button>
        </>
      )}
    </Sheet>
  )
}
