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
import { useBranding } from '../../lib/branding.jsx'

// Último ejercicio elegido para registrar, cacheado por atleta (sobrevive recargas).
const lastEjKey = (token) => `coachpro:lastEj:${token}`
function loadLastEj(token) {
  try { return localStorage.getItem(lastEjKey(token)) || '' } catch { return '' }
}
function saveLastEj(token, id) {
  try { if (id) localStorage.setItem(lastEjKey(token), id) } catch { /* storage no disponible */ }
}

export function Hoy({ token, onIrNutricion }) {
  const { logoUrl, primary, name } = useBranding()
  const hoy = todayISO()
  const perfilQ = usePerfilYRutina(token, hoy)
  const sesionQ = usePortalSesionHoy(token, hoy)
  const nutriQ = usePortalNutricion(token, hoy)
  const histQ = usePortalHistorial(token, 30)
  const registrar = useRegistrarSet(token)
  const asistir = useMarcarAsistencia(token)
  const [registrarOpen, setRegistrarOpen] = useState(false)

  if (perfilQ.isPending) return <Loading label="Cargando tu día…" />
  if (perfilQ.error)
    return <Empty icon="alert-triangle" title="Link inválido" hint="Pide a tu coach un nuevo enlace." />
  if (!perfilQ.data) return <Loading label="Cargando tu día…" />

  const { atleta, rutina, asistio_hoy } = perfilQ.data
  const sets = sesionQ.data || []
  const nutri = nutriQ.data

  // sets completados por ejercicio (hoy): contador + detalle (reps/peso por serie)
  const hechosPorEj = {}
  const detallePorEj = {}
  for (const s of sets) {
    if (!s.completada) continue
    hechosPorEj[s.ejercicio_id] = (hechosPorEj[s.ejercicio_id] || 0) + 1
    ;(detallePorEj[s.ejercicio_id] ||= []).push(s)
  }
  for (const id in detallePorEj) detallePorEj[id].sort((a, b) => a.serie_num - b.serie_num)

  const setsPlaneados = rutina?.ejercicios?.reduce((a, e) => a + (e.series || 0), 0) || 0
  const setsHechos = Object.values(hechosPorEj).reduce((a, n) => a + n, 0)

  const objetivo = nutri?.objetivo || null

  // Nutrición ya no forma parte del Score: el atleta no registra comidas
  // (el coach define metas + menú). El Score se basa en Asistencia + Rutina;
  // scoreDia redistribuye el peso de nutrición al omitirla (sin `consumido`).
  const score = scoreDia({ asistioHoy: asistio_hoy, setsPlaneados, setsHechos })

  // racha a partir del historial (con el score de hoy en vivo)
  const scoresMap = {}
  for (const d of histQ.data || [])
    scoresMap[d.fecha] = scoreDia({
      asistioHoy: d.asistio,
      setsPlaneados: d.sets_planeados,
      setsHechos: d.sets_hechos
    }).total
  scoresMap[hoy] = score.total
  const racha = calcularRacha(scoresMap, hoy)

  // Meta de proteína del día (informativa en el mini-stat).
  const protMeta = objetivo?.proteina_g || null

  function registrarSerie(ej) {
    const hechos = hechosPorEj[ej.ejercicio_id] || 0
    // Sin tope: se permiten series extra más allá de las indicadas por el coach.
    saveLastEj(token, ej.ejercicio_id)
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
      {/* Header del portal con logo del coach */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: space.md, minHeight: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', maxWidth: '100%' }}>
          {logoUrl && (
            <img src={logoUrl} alt="" style={{ height: 32, maxWidth: 140, objectFit: 'contain', flexShrink: 0 }} />
          )}
          {(name || !logoUrl) && (
            <span style={{ ...font.title, fontSize: 17, fontWeight: 700, color: primary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name || 'CoachPro'}
            </span>
          )}
        </div>
      </div>

      {/* Score protagonista */}
      <div style={{ textAlign: 'center', marginBottom: space.md }}>
        <Overline color={primary}>Hola, {atleta.nombre.split(' ')[0]}</Overline>
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
          label="Proteína"
          value={protMeta != null ? `${protMeta}g` : '—'}
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
          const detalle = detallePorEj[ej.ejercicio_id] || []
          // Puntos: los del plan + siempre uno más para permitir una serie extra.
          const totalDots = Math.max(ej.series, hechos + 1)
          return (
            <Card key={ej.rutina_ejercicio_id} accent={completo ? colors.accent : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...font.body, fontWeight: 600, color: colors.title }}>{ej.nombre}</div>
                  <div style={{ ...font.small, color: colors.muted }}>
                    {ej.series}×{ej.reps}{ej.peso_kg ? ` · ${ej.peso_kg}kg` : ''}
                    {hechos > ej.series ? ` · +${hechos - ej.series} extra` : ''}
                  </div>
                </div>
                {completo && <Icon name="circle-check" size={22} color={colors.accent} />}
              </div>

              {/* Dots de series — toca para registrar. Verde = plan, azul = serie extra. */}
              <div style={{ display: 'flex', gap: 8, marginTop: space.sm, flexWrap: 'wrap' }}>
                {Array.from({ length: totalDots }).map((_, i) => {
                  const done = i < hechos
                  const siguiente = i === hechos
                  const extra = i >= ej.series           // más allá de lo indicado por el coach
                  const marca = extra ? colors.info : colors.accent
                  return (
                    <button
                      key={i}
                      onClick={() => siguiente && registrarSerie(ej)}
                      // Sin `registrar.isPending`: offline la mutación queda pausada
                      // (pending) y bloquearía TODAS las series. El optimistic update
                      // avanza `hechos`, así que `siguiente` ya evita sobre-registrar.
                      disabled={!siguiente}
                      title={extra ? 'Serie extra' : `Serie ${i + 1}`}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        border: `0.5px solid ${done ? marca : colors.border}`,
                        background: done ? marca : 'transparent',
                        color: done ? (extra ? '#FFFFFF' : colors.accentInk) : siguiente ? marca : colors.hint,
                        cursor: siguiente ? 'pointer' : 'default',
                        fontWeight: 600,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {done ? <Icon name="check" size={16} /> : extra ? '+' : i + 1}
                    </button>
                  )
                })}
              </div>

              {/* Pesos registrados por serie (lo que el atleta cargó en cada una) */}
              {detalle.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: space.sm }}>
                  {detalle.map((s) => {
                    const esExtra = s.serie_num > ej.series
                    return (
                      <span
                        key={s.serie_num}
                        style={{
                          ...font.small,
                          color: colors.muted,
                          background: colors.surface2,
                          border: `0.5px solid ${esExtra ? colors.info : colors.border}`,
                          borderRadius: radius.sm,
                          padding: '3px 8px'
                        }}
                      >
                        <span style={{ color: esExtra ? colors.info : colors.accent, fontWeight: 600 }}>S{s.serie_num}</span>
                        {' · '}
                        {s.peso_hecho_kg != null ? `${s.peso_hecho_kg}kg` : '—'}
                        {' × '}
                        {s.reps_hechas ?? ej.reps}
                      </span>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* Acciones */}
      <Row style={{ marginTop: space.lg }}>
        <Button icon="plus" onClick={() => setRegistrarOpen(true)} style={{ flex: 2 }} disabled={!rutina}>
          Registrar serie
        </Button>
        <Button variant="surface" icon="bowl" onClick={onIrNutricion} style={{ flex: 1 }}>
          Menú
        </Button>
      </Row>

      {registrarOpen && (
        <RegistrarSerieSheet
          onClose={() => setRegistrarOpen(false)}
          rutina={rutina}
          hechosPorEj={hechosPorEj}
          initialEjId={loadLastEj(token)}
          onRegistrar={(payload) => {
            saveLastEj(token, payload.ejercicio_id)
            registrar.mutate({ ...payload, rutina_id: rutina.rutina_id, fecha: hoy })
          }}
        />
      )}
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

function RegistrarSerieSheet({ onClose, rutina, hechosPorEj, initialEjId, onRegistrar }) {
  const opts = (rutina?.ejercicios || []).map((e) => ({ value: e.ejercicio_id, label: e.nombre }))
  // Se monta al abrir: arranca con el último ejercicio registrado (cacheado)
  // si sigue en la rutina; si no, con el primero.
  const [f, setF] = useState(() => {
    const ejs = rutina?.ejercicios || []
    const inicial = ejs.find((e) => e.ejercicio_id === initialEjId) || ejs[0]
    return inicial
      ? { ejercicio_id: inicial.ejercicio_id, reps: String(inicial.reps), peso: inicial.peso_kg != null ? String(inicial.peso_kg) : '' }
      : { ejercicio_id: '', reps: '', peso: '' }
  })

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
    <Sheet open onClose={onClose} title="Registrar serie">
      {opts.length === 0 ? (
        <div style={{ ...font.small, color: colors.muted }}>No hay rutina hoy.</div>
      ) : (
        <>
          <Select label="Ejercicio" value={f.ejercicio_id} onChange={elegir} options={opts} />
          {ejSel && (() => {
            const nextSerie = (hechosPorEj[ejSel.ejercicio_id] || 0) + 1
            const esExtra = nextSerie > ejSel.series
            return (
              <Badge color={esExtra ? colors.info : colors.muted} style={{ marginBottom: space.md }}>
                {esExtra ? `Serie ${nextSerie} · extra` : `Serie ${nextSerie} de ${ejSel.series}`}
              </Badge>
            )
          })()}
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
