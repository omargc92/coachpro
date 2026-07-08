// ============================================================
// Hooks de datos (TanStack Query)
//  - Coach: acceso directo a tablas (RLS por auth.uid)
//  - Portal atleta: vía RPC portal_* (token)
// Fase 1 cubre el perfil del coach; fases siguientes amplían.
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase.js'
import { scoreDia } from './score.js'

// ---------- helpers de fecha (local, no UTC) ----------
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function isodowHoy() {
  const dow = new Date().getDay() // 0=Dom..6=Sáb
  return dow === 0 ? 7 : dow // 1=Lun..7=Dom
}
function semanasDesde(fecha) {
  if (!fecha) return 0
  const ms = Date.now() - new Date(fecha + 'T00:00:00').getTime()
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24 * 7)) + 1)
}
function diasDesde(fecha) {
  if (!fecha) return null
  const ms = Date.now() - new Date(fecha + 'T00:00:00').getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

// ---------- COACH ----------

// Devuelve la fila coaches del usuario autenticado, creándola si no existe.
export function useCoach(user) {
  return useQuery({
    queryKey: ['coach', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: existing, error } = await supabase
        .from('coaches')
        .select('*')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      if (error) throw error
      if (existing) return existing

      // Primer login: crea la fila del coach.
      const { data: created, error: e2 } = await supabase
        .from('coaches')
        .insert({
          auth_user_id: user.id,
          email: user.email,
          nombre: user.email?.split('@')[0] || 'Entrenador'
        })
        .select('*')
        .single()
      if (e2) throw e2
      return created
    }
  })
}

// Resumen de atletas con Score de Disciplina de HOY (para ordenar la lista).
// Hace pocas consultas y agrega en el cliente (single-coach, pocos atletas).
export function useAtletasResumen(coach) {
  return useQuery({
    queryKey: ['atletas-resumen', coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const hoy = todayISO()
      const dow = isodowHoy()
      const desde = (() => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().slice(0, 10)
      })()

      const [atletas, asignaciones, rutEjer, asisHoy, asisRec, sesHoy, objNut, comHoy] =
        await Promise.all([
          supabase.from('atletas').select('*').eq('activo', true).order('nombre'),
          supabase.from('asignaciones').select('atleta_id, rutina_id, dia_semana, activa').eq('activa', true),
          supabase.from('rutina_ejercicios').select('rutina_id, series'),
          supabase.from('asistencias').select('atleta_id').eq('fecha', hoy),
          supabase.from('asistencias').select('atleta_id, fecha').gte('fecha', desde),
          supabase.from('sesiones').select('id, atleta_id, fecha').eq('fecha', hoy),
          supabase.from('objetivos_nutricion').select('*').lte('vigente_desde', hoy).order('vigente_desde', { ascending: false }),
          supabase.from('comidas').select('atleta_id, kcal, proteina_g').eq('fecha', hoy)
        ])

      for (const r of [atletas, asignaciones, rutEjer, asisHoy, asisRec, sesHoy, objNut, comHoy])
        if (r.error) throw r.error

      // series planeadas por rutina
      const seriesPorRutina = {}
      for (const re of rutEjer.data) seriesPorRutina[re.rutina_id] = (seriesPorRutina[re.rutina_id] || 0) + (re.series || 0)

      // sets completados hoy por atleta
      const sesIds = sesHoy.data.map((s) => s.id)
      let setsPorAtleta = {}
      if (sesIds.length) {
        const sets = await supabase
          .from('sesion_sets')
          .select('sesion_id, completada')
          .in('sesion_id', sesIds)
        if (sets.error) throw sets.error
        const sesAtleta = Object.fromEntries(sesHoy.data.map((s) => [s.id, s.atleta_id]))
        for (const st of sets.data)
          if (st.completada) setsPorAtleta[sesAtleta[st.sesion_id]] = (setsPorAtleta[sesAtleta[st.sesion_id]] || 0) + 1
      }

      const asistioHoySet = new Set(asisHoy.data.map((a) => a.atleta_id))
      const sesionHoySet = new Set(sesHoy.data.map((s) => s.atleta_id))

      // última actividad (asistencia o sesión) por atleta
      const ultActividad = {}
      for (const a of asisRec.data)
        if (!ultActividad[a.atleta_id] || a.fecha > ultActividad[a.atleta_id]) ultActividad[a.atleta_id] = a.fecha
      for (const s of sesHoy.data)
        if (!ultActividad[s.atleta_id] || s.fecha > ultActividad[s.atleta_id]) ultActividad[s.atleta_id] = s.fecha

      // objetivo vigente por atleta (ya ordenado desc → el primero gana)
      const objPorAtleta = {}
      for (const o of objNut.data) if (!objPorAtleta[o.atleta_id]) objPorAtleta[o.atleta_id] = o

      // consumido hoy por atleta
      const consumidoPorAtleta = {}
      for (const c of comHoy.data) {
        const acc = (consumidoPorAtleta[c.atleta_id] ||= { kcal: 0, proteina_g: 0 })
        acc.kcal += c.kcal || 0
        acc.proteina_g += c.proteina_g || 0
      }

      // asignación de hoy por atleta → series planeadas
      const planPorAtleta = {}
      for (const asg of asignaciones.data)
        if (asg.dia_semana === dow) planPorAtleta[asg.atleta_id] = { rutina_id: asg.rutina_id }

      return atletas.data
        .map((at) => {
          const plan = planPorAtleta[at.id]
          const setsPlaneados = plan ? seriesPorRutina[plan.rutina_id] || 0 : 0
          const asistioHoy = asistioHoySet.has(at.id) || sesionHoySet.has(at.id)
          const score = scoreDia({
            asistioHoy,
            setsPlaneados,
            setsHechos: setsPorAtleta[at.id] || 0,
            objetivo: objPorAtleta[at.id] || null,
            consumido: consumidoPorAtleta[at.id] || null
          })
          const ult = ultActividad[at.id] || null
          const diasSin = ult ? diasDesde(ult) : diasDesde(at.fecha_inicio)
          return {
            ...at,
            score: score.total,
            asistioHoy,
            tieneRutinaHoy: !!plan,
            semana: semanasDesde(at.fecha_inicio),
            diasSinRegistro: diasSin,
            enRiesgo: (diasSin ?? 0) >= 3
          }
        })
        .sort((a, b) => b.score - a.score)
    }
  })
}

export function useCrearAtleta(coach) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (datos) => {
      const { data, error } = await supabase
        .from('atletas')
        .insert({ ...datos, coach_id: coach.id })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atletas-resumen'] })
  })
}

// ---------- DETALLE DE ATLETA ----------

export function useAtleta(atletaId) {
  return useQuery({
    queryKey: ['atleta', atletaId],
    enabled: !!atletaId,
    queryFn: async () => {
      const { data, error } = await supabase.from('atletas').select('*').eq('id', atletaId).single()
      if (error) throw error
      return data
    }
  })
}

export function useMediciones(atletaId) {
  return useQuery({
    queryKey: ['mediciones', atletaId],
    enabled: !!atletaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mediciones')
        .select('*')
        .eq('atleta_id', atletaId)
        .order('fecha')
      if (error) throw error
      return data
    }
  })
}

// Forma canónica de la rutina semanal que consume exportPdf.js:
//   [{ dia_semana, nombre, ejercicios: [{ nombre, series, reps, peso_kg }] }]
// OJO: existe una segunda fuente con la MISMA forma, la RPC
// `portal_rutina_semanal` (migración 0009) que usa `fetchPortalRutinaSemanal`
// para el portal del atleta (acceso por token, sin sesión). Si cambia la
// forma, hay que actualizar AMBAS (aquí y en la RPC) o los PDF divergen.

// Rutina semanal completa del atleta (con ejercicios) — para exportar a PDF (lado coach).
// Función suelta (no hook): se llama on-demand al generar el PDF.
export async function fetchRutinaSemanalAtleta(atletaId) {
  const { data, error } = await supabase
    .from('asignaciones')
    .select('dia_semana, activa, rutinas(nombre, rutina_ejercicios(orden, series, reps, peso_kg, ejercicios(nombre)))')
    .eq('atleta_id', atletaId)
    .eq('activa', true)
    .order('dia_semana')
  if (error) throw error
  // Normaliza a la forma que consume exportPdf: [{ dia_semana, nombre, ejercicios:[{nombre,series,reps,peso_kg}] }]
  return (data || []).map((a) => ({
    dia_semana: a.dia_semana,
    nombre: a.rutinas?.nombre || '—',
    ejercicios: (a.rutinas?.rutina_ejercicios || [])
      .slice()
      .sort((x, y) => x.orden - y.orden)
      .map((re) => ({ nombre: re.ejercicios?.nombre || '—', series: re.series, reps: re.reps, peso_kg: re.peso_kg }))
  }))
}

// Rutinas asignadas al atleta (con nombre y día).
export function useAsignacionesAtleta(atletaId) {
  return useQuery({
    queryKey: ['asignaciones', atletaId],
    enabled: !!atletaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asignaciones')
        .select('id, dia_semana, activa, rutinas(id, nombre)')
        .eq('atleta_id', atletaId)
        .order('dia_semana')
      if (error) throw error
      return data
    }
  })
}

// Adherencia nutricional de hoy + asistencias recientes (para el detalle).
export function useAtletaActividad(atletaId) {
  return useQuery({
    queryKey: ['atleta-actividad', atletaId],
    enabled: !!atletaId,
    queryFn: async () => {
      const hoy = todayISO()
      const [obj, com, asis] = await Promise.all([
        supabase
          .from('objetivos_nutricion')
          .select('*')
          .eq('atleta_id', atletaId)
          .lte('vigente_desde', hoy)
          .order('vigente_desde', { ascending: false })
          .limit(1),
        supabase.from('comidas').select('kcal, proteina_g, carbos_g, grasas_g').eq('atleta_id', atletaId).eq('fecha', hoy),
        supabase.from('asistencias').select('fecha, presente').eq('atleta_id', atletaId).order('fecha', { ascending: false }).limit(14)
      ])
      for (const r of [obj, com, asis]) if (r.error) throw r.error
      const consumido = com.data.reduce(
        (a, c) => ({
          kcal: a.kcal + (c.kcal || 0),
          proteina_g: a.proteina_g + (c.proteina_g || 0),
          carbos_g: a.carbos_g + (c.carbos_g || 0),
          grasas_g: a.grasas_g + (c.grasas_g || 0)
        }),
        { kcal: 0, proteina_g: 0, carbos_g: 0, grasas_g: 0 }
      )
      return { objetivo: obj.data[0] || null, consumido, asistencias: asis.data }
    }
  })
}

// Define/actualiza los objetivos de nutrición del atleta (vigentes desde hoy).
// Versiona por fecha: reemplaza el objetivo de hoy si ya existe, si no inserta uno.
export function useGuardarObjetivoNutricion(atletaId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (metas) => {
      const hoy = todayISO()
      const fila = {
        atleta_id: atletaId,
        kcal: Math.round(Number(metas.kcal) || 0),
        proteina_g: Math.round(Number(metas.proteina_g) || 0),
        carbos_g: Math.round(Number(metas.carbos_g) || 0),
        grasas_g: Math.round(Number(metas.grasas_g) || 0),
        vigente_desde: hoy
      }
      const { data: existente, error: e0 } = await supabase
        .from('objetivos_nutricion')
        .select('id')
        .eq('atleta_id', atletaId)
        .eq('vigente_desde', hoy)
        .maybeSingle()
      if (e0) throw e0

      if (existente) {
        const { error } = await supabase.from('objetivos_nutricion').update(fila).eq('id', existente.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('objetivos_nutricion').insert(fila)
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['atleta-actividad', atletaId] })
      qc.invalidateQueries({ queryKey: ['atletas-resumen'] })
    }
  })
}

// ---------- CATÁLOGO DE EJERCICIOS ----------

export function useEjercicios(coach) {
  return useQuery({
    queryKey: ['ejercicios', coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ejercicios')
        .select('*')
        .order('grupo_muscular')
        .order('nombre')
      if (error) throw error
      return data
    }
  })
}

export function useGuardarEjercicio(coach) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ej) => {
      if (ej.id) {
        const { error } = await supabase
          .from('ejercicios')
          .update({ nombre: ej.nombre, grupo_muscular: ej.grupo_muscular, gif_url: ej.gif_url || null })
          .eq('id', ej.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ejercicios')
          .insert({ coach_id: coach.id, nombre: ej.nombre, grupo_muscular: ej.grupo_muscular, gif_url: ej.gif_url || null })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ejercicios'] })
  })
}

export function useEliminarEjercicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('ejercicios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ejercicios'] })
  })
}

// ---------- RUTINAS (builder + asignación) ----------

export function useRutinas(coach) {
  return useQuery({
    queryKey: ['rutinas', coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rutinas')
        .select('*, rutina_ejercicios(id)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.map((r) => ({ ...r, num_ejercicios: r.rutina_ejercicios?.length || 0 }))
    }
  })
}

export function useRutinaDetalle(rutinaId) {
  return useQuery({
    queryKey: ['rutina', rutinaId],
    enabled: !!rutinaId,
    queryFn: async () => {
      const [rut, ejers, asign] = await Promise.all([
        supabase.from('rutinas').select('*').eq('id', rutinaId).single(),
        supabase
          .from('rutina_ejercicios')
          .select('*, ejercicios(id, nombre, grupo_muscular)')
          .eq('rutina_id', rutinaId)
          .order('orden'),
        supabase
          .from('asignaciones')
          .select('id, dia_semana, activa, atleta_id, atletas(nombre)')
          .eq('rutina_id', rutinaId)
          .order('dia_semana')
      ])
      for (const r of [rut, ejers, asign]) if (r.error) throw r.error
      return { rutina: rut.data, ejercicios: ejers.data, asignaciones: asign.data }
    }
  })
}

export function useCrearRutina(coach) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ nombre, descripcion }) => {
      const { data, error } = await supabase
        .from('rutinas')
        .insert({ coach_id: coach.id, nombre, descripcion: descripcion || null })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rutinas'] })
  })
}

export function useEliminarRutina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('rutinas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rutinas'] })
  })
}

// Operaciones sobre los ejercicios DE una rutina (invalidan ese detalle).
function invalidarRutina(qc) {
  qc.invalidateQueries({ queryKey: ['rutina'] })
  qc.invalidateQueries({ queryKey: ['rutinas'] })
}

export function useAgregarEjercicioARutina(rutinaId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ejercicio_id, orden, series, reps, peso_kg, descanso_seg }) => {
      const { error } = await supabase.from('rutina_ejercicios').insert({
        rutina_id: rutinaId,
        ejercicio_id,
        orden: orden ?? 0,
        series: series ?? 3,
        reps: reps ?? 10,
        peso_kg: peso_kg ?? null,
        descanso_seg: descanso_seg ?? 90
      })
      if (error) throw error
    },
    onSuccess: () => invalidarRutina(qc)
  })
}

export function useActualizarRutinaEjercicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...campos }) => {
      const { error } = await supabase.from('rutina_ejercicios').update(campos).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidarRutina(qc)
  })
}

export function useEliminarRutinaEjercicio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('rutina_ejercicios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidarRutina(qc)
  })
}

// Reordenar: persiste el campo orden de una lista completa.
export function useReordenarRutina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (items) => {
      // items: [{ id, orden }, ...]
      for (const it of items) {
        const { error } = await supabase.from('rutina_ejercicios').update({ orden: it.orden }).eq('id', it.id)
        if (error) throw error
      }
    },
    onSuccess: () => invalidarRutina(qc)
  })
}

export function useAsignarRutina() {
  const qc = useQueryClient()
  return useMutation({
    // dias: arreglo de días (1..7). Acepta también `dia_semana` escalar por
    // compatibilidad. Semántica: una sola rutina activa por (atleta, día),
    // así que reemplaza cualquier asignación activa que ya exista en esos días.
    mutationFn: async ({ atleta_id, rutina_id, dias, dia_semana }) => {
      const lista = Array.from(new Set((dias ?? [dia_semana]).map(Number))).filter(Boolean)
      if (lista.length === 0) return
      // Desactiva la rutina que hubiera en esos días (evita duplicados / choque con el índice único).
      const { error: offErr } = await supabase
        .from('asignaciones')
        .update({ activa: false })
        .eq('atleta_id', atleta_id)
        .eq('activa', true)
        .in('dia_semana', lista)
      if (offErr) throw offErr
      const { error } = await supabase
        .from('asignaciones')
        .insert(lista.map((d) => ({ atleta_id, rutina_id, dia_semana: d, activa: true })))
      if (error) throw error
    },
    onSuccess: () => {
      invalidarRutina(qc)
      qc.invalidateQueries({ queryKey: ['atletas-resumen'] })
      qc.invalidateQueries({ queryKey: ['asignaciones'] })
    }
  })
}

export function useQuitarAsignacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('asignaciones').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidarRutina(qc)
      qc.invalidateQueries({ queryKey: ['atletas-resumen'] })
    }
  })
}

// Lista ligera de atletas (para selects de asignación).
export function useAtletasLista(coach) {
  return useQuery({
    queryKey: ['atletas-lista', coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atletas')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')
      if (error) throw error
      return data
    }
  })
}

// ---------- AGENDA (sesiones del día por atleta) ----------

export function useAgenda(coach) {
  return useQuery({
    queryKey: ['agenda', coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const hoy = todayISO()
      const dow = isodowHoy()
      const [atletas, asign, sesHoy] = await Promise.all([
        supabase.from('atletas').select('id, nombre').eq('activo', true).order('nombre'),
        supabase
          .from('asignaciones')
          .select('atleta_id, dia_semana, activa, rutinas(nombre)')
          .eq('activa', true)
          .eq('dia_semana', dow),
        supabase.from('sesiones').select('id, atleta_id, completada').eq('fecha', hoy)
      ])
      for (const r of [atletas, asign, sesHoy]) if (r.error) throw r.error

      const sesPorAtleta = {}
      for (const s of sesHoy.data) sesPorAtleta[s.atleta_id] = s
      const rutinaPorAtleta = {}
      for (const a of asign.data) rutinaPorAtleta[a.atleta_id] = a.rutinas?.nombre || null

      return atletas.data.map((at) => ({
        ...at,
        rutinaHoy: rutinaPorAtleta[at.id] || null,
        sesion: sesPorAtleta[at.id] || null,
        estado: !rutinaPorAtleta[at.id]
          ? 'descanso'
          : sesPorAtleta[at.id]?.completada
            ? 'completada'
            : sesPorAtleta[at.id]
              ? 'en_curso'
              : 'pendiente'
      }))
    }
  })
}

// ---------- CHAT (coach) ----------

export function useConversaciones(coach) {
  return useQuery({
    queryKey: ['conversaciones', coach?.id],
    enabled: !!coach,
    queryFn: async () => {
      const [atletas, msgs] = await Promise.all([
        supabase.from('atletas').select('id, nombre').eq('activo', true),
        supabase.from('mensajes').select('*').order('created_at', { ascending: false })
      ])
      for (const r of [atletas, msgs]) if (r.error) throw r.error
      const ultimo = {}
      const noLeidos = {}
      for (const m of msgs.data) {
        if (!ultimo[m.atleta_id]) ultimo[m.atleta_id] = m
        if (m.autor === 'atleta' && !m.leido) noLeidos[m.atleta_id] = (noLeidos[m.atleta_id] || 0) + 1
      }
      return atletas.data
        .map((a) => ({ ...a, ultimo: ultimo[a.id] || null, noLeidos: noLeidos[a.id] || 0 }))
        .sort((a, b) => (b.ultimo?.created_at || '').localeCompare(a.ultimo?.created_at || ''))
    }
  })
}

export function useHilo(atletaId) {
  return useQuery({
    queryKey: ['hilo', atletaId],
    enabled: !!atletaId,
    queryFn: async () => {
      // marca como leídos los mensajes del atleta
      await supabase.from('mensajes').update({ leido: true }).eq('atleta_id', atletaId).eq('autor', 'atleta').eq('leido', false)
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .eq('atleta_id', atletaId)
        .order('created_at')
      if (error) throw error
      return data
    }
  })
}

export function useEnviarMensajeCoach(atletaId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (texto) => {
      const { error } = await supabase
        .from('mensajes')
        .insert({ atleta_id: atletaId, autor: 'coach', texto, leido: false })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hilo', atletaId] })
      qc.invalidateQueries({ queryKey: ['conversaciones'] })
    }
  })
}

// ---------- PORTAL ATLETA (RPC) ----------

export function usePerfilYRutina(token, fecha) {
  return useQuery({
    queryKey: ['portal', 'perfil', token, fecha],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_perfil_y_rutina', {
        p_token: token,
        p_fecha: fecha
      })
      if (error) throw error
      return data
    }
  })
}

// Rutina semanal del atleta desde el portal (para exportar a PDF, lado atleta).
// Devuelve la MISMA forma canónica que `fetchRutinaSemanalAtleta` (ver ahí);
// la RPC portal_rutina_semanal (0009) la construye en SQL.
export async function fetchPortalRutinaSemanal(token) {
  const { data, error } = await supabase.rpc('portal_rutina_semanal', { p_token: token })
  if (error) throw error
  return data || []
}

export function usePortalNutricion(token, fecha) {
  return useQuery({
    queryKey: ['portal', 'nutricion', token, fecha],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_nutricion', { p_token: token, p_fecha: fecha })
      if (error) throw error
      return data
    }
  })
}

// Las 3 mutaciones del portal usan mutationKey + defaults registrados en
// queryClient.js (offline-capable). El token viaja en `variables` (no en
// closure) para que la mutación pueda reanudarse tras recargar la app.
// `mapVars` arma las variables inyectando el token (por defecto lo mezcla
// en el objeto; la asistencia recibe un `fecha` escalar).
function usePortalMutation(mutationKey, token, mapVars = (v, tk) => ({ ...v, token: tk })) {
  const m = useMutation({ mutationKey })
  return {
    ...m,
    mutate: (v, opts) => m.mutate(mapVars(v, token), opts),
    mutateAsync: (v, opts) => m.mutateAsync(mapVars(v, token), opts)
  }
}

export function useRegistrarSet(token) {
  return usePortalMutation(['portal', 'registrar-set'], token)
}

export function useMarcarAsistencia(token) {
  return usePortalMutation(['portal', 'marcar-asistencia'], token, (fecha, tk) => ({ token: tk, fecha }))
}

export function usePortalSesionHoy(token, fecha) {
  return useQuery({
    queryKey: ['portal', 'sesion', token, fecha],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_sesion_hoy', { p_token: token, p_fecha: fecha })
      if (error) throw error
      return data
    }
  })
}

export function usePortalHistorial(token, dias = 30) {
  return useQuery({
    queryKey: ['portal', 'historial', token, dias],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_historial', { p_token: token, p_dias: dias })
      if (error) throw error
      return data
    }
  })
}

export function usePortalProgreso(token) {
  return useQuery({
    queryKey: ['portal', 'progreso', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_progreso', { p_token: token })
      if (error) throw error
      return data
    }
  })
}

export function useRegistrarComida(token) {
  return usePortalMutation(['portal', 'registrar-comida'], token)
}

export function usePortalMensajes(token) {
  return useQuery({
    queryKey: ['portal', 'mensajes', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_leer_mensajes', { p_token: token })
      if (error) throw error
      return data
    },
    refetchInterval: 15000
  })
}

export function useEnviarMensajePortal(token) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (texto) => {
      const { error } = await supabase.rpc('portal_enviar_mensaje', { p_token: token, p_texto: texto })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'mensajes', token] })
  })
}

// Sube una foto al bucket 'fotos' y devuelve su URL pública.
export async function subirFoto(file, carpeta = 'platos') {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const nombre = `${carpeta}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('fotos').upload(nombre, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw error
  const { data } = supabase.storage.from('fotos').getPublicUrl(nombre)
  return data.publicUrl
}

// ---------- ONBOARDING ----------

export function useCompletarOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (coachId) => {
      const { error } = await supabase
        .from('coaches')
        .update({ onboarding_completado: true })
        .eq('id', coachId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach'] })
  })
}

// ---------- SUSCRIPCIÓN ----------

export function useSubscription(coachId) {
  return useQuery({
    queryKey: ['subscription', coachId],
    enabled: !!coachId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('coach_id', coachId)
        .single()
      if (error) throw error
      return data
    }
  })
}

// ---------- BRANDING DEL COACH ----------

// Sube el logo al bucket coach-logos y devuelve la URL pública.
// Elimina el logo anterior si existe para no acumular archivos huérfanos.
export async function subirLogo(file, coachId) {
  const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
  const nombre = `${coachId}/logo.${ext}`
  const { error } = await supabase.storage
    .from('coach-logos')
    .upload(nombre, file, { cacheControl: '31536000', upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('coach-logos').getPublicUrl(nombre)
  // Rompe la caché del navegador añadiendo un timestamp.
  return `${data.publicUrl}?v=${Date.now()}`
}

// Guarda logo_url, brand_primary y brand_accent en el perfil del coach.
export function useActualizarBranding(coach) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ logo_url, brand_primary, brand_accent }) => {
      const { error } = await supabase
        .from('coaches')
        .update({ logo_url, brand_primary, brand_accent })
        .eq('id', coach.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coach', coach.auth_user_id] })
  })
}

// Branding del coach propietario de un portal de atleta (por token).
export function usePortalBranding(token) {
  return useQuery({
    queryKey: ['portal', 'branding', token],
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_branding', { p_token: token })
      if (error) throw error
      return data
    }
  })
}

// ---------- FOTOS DE PROGRESO ----------

// Atleta: lee su historial de fotos de progreso (vía RPC por token).
export function usePortalFotosProgreso(token) {
  return useQuery({
    queryKey: ['portal', 'fotos-progreso', token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('portal_fotos_progreso', { p_token: token })
      if (error) throw error
      return data ?? []
    }
  })
}

// Atleta: registra una nueva foto de progreso (vía RPC por token).
export function useAgregarFotoProgreso(token) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ foto_url, nota }) => {
      const { error } = await supabase.rpc('portal_agregar_foto_progreso', {
        p_token: token,
        p_foto_url: foto_url,
        p_nota: nota ?? null
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal', 'fotos-progreso', token] })
  })
}

// Coach: lee las fotos de progreso de un atleta (acceso directo con RLS).
export function useFotosProgresoCoach(atletaId) {
  return useQuery({
    queryKey: ['fotos-progreso', atletaId],
    enabled: !!atletaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fotos_progreso')
        .select('id, foto_url, nota, fecha')
        .eq('atleta_id', atletaId)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    }
  })
}

// ---------- ARCHIVAR ATLETA ----------

// Coach: desactiva un atleta (soft delete — los datos se conservan).
export function useArchivarAtleta(coachId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (atletaId) => {
      const { error } = await supabase
        .from('atletas')
        .update({ activo: false })
        .eq('id', atletaId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['atletas-resumen', coachId] })
  })
}
