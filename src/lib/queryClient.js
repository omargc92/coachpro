// ============================================================
// QueryClient + cola de mutaciones OFFLINE.
// ------------------------------------------------------------
// Las mutaciones del portal (registrar set / asistencia / comida) se
// PAUSAN cuando no hay red (networkMode 'online') y se reenvían solas al
// reconectar. Se persisten en IndexedDB (ver main.jsx) para sobrevivir a
// un cierre de la app; por eso su `mutationFn` se registra aquí como
// DEFAULT por mutationKey (la función no se serializa, el `variables` sí,
// e incluye el token). Los optimistic updates dan feedback inmediato sin
// red y mantienen correcto el número de serie.
// ============================================================
import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase.js'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
      gcTime: 1000 * 60 * 60 * 24, // 24h: necesario para restaurar queries persistidas
      // offlineFirst: sin red, la query usa la caché (o error) en vez de quedar
      // "paused" con data undefined (que rompía guards basados en isLoading).
      networkMode: 'offlineFirst'
    },
    mutations: {
      networkMode: 'online', // sin red → la mutación se pausa (no se ejecuta)
      retry: 0               // exactly-once al reanudar; evita duplicados
    }
  }
})

// Invalidación con debounce: al drenar una cola offline de N mutaciones no
// queremos N refetches del árbol ['portal']; se coalescen en uno solo.
let invalTimer = null
const invalidarPortal = () => {
  if (invalTimer) clearTimeout(invalTimer)
  invalTimer = setTimeout(() => {
    invalTimer = null
    queryClient.invalidateQueries({ queryKey: ['portal'] })
  }, 400)
}

// ── registrar set ─────────────────────────────────────────────
queryClient.setMutationDefaults(['portal', 'registrar-set'], {
  mutationFn: async (v) => {
    const { data, error } = await supabase.rpc('portal_registrar_set', {
      p_token: v.token,
      p_ejercicio_id: v.ejercicio_id,
      p_serie_num: v.serie_num,
      p_reps: v.reps,
      p_peso: v.peso,
      p_rutina_id: v.rutina_id ?? null,
      p_fecha: v.fecha
    })
    if (error) throw error
    return data
  },
  // Optimista: agrega el set a la sesión del día en caché (contador avanza offline).
  onMutate: async (v) => {
    const key = ['portal', 'sesion', v.token, v.fecha]
    await queryClient.cancelQueries({ queryKey: key })
    const prev = queryClient.getQueryData(key)
    queryClient.setQueryData(key, (old) => ([
      ...(old || []),
      {
        id: `optim-${v.ejercicio_id}-${v.serie_num}`,
        ejercicio_id: v.ejercicio_id,
        serie_num: v.serie_num,
        reps_hechas: v.reps,
        peso_hecho_kg: v.peso,
        completada: true,
        _optimistic: true
      }
    ]))
    return { key, prev }
  },
  onError: (_e, _v, ctx) => { if (ctx?.prev !== undefined) queryClient.setQueryData(ctx.key, ctx.prev) },
  onSuccess: invalidarPortal
})

// ── marcar asistencia ─────────────────────────────────────────
queryClient.setMutationDefaults(['portal', 'marcar-asistencia'], {
  mutationFn: async (v) => {
    const { error } = await supabase.rpc('portal_marcar_asistencia', { p_token: v.token, p_fecha: v.fecha })
    if (error) throw error
  },
  onMutate: async (v) => {
    const key = ['portal', 'perfil', v.token, v.fecha]
    await queryClient.cancelQueries({ queryKey: key })
    const prev = queryClient.getQueryData(key)
    queryClient.setQueryData(key, (old) => (old ? { ...old, asistio_hoy: true } : old))
    return { key, prev }
  },
  onError: (_e, _v, ctx) => { if (ctx?.prev !== undefined) queryClient.setQueryData(ctx.key, ctx.prev) },
  onSuccess: invalidarPortal
})

// ── registrar comida ──────────────────────────────────────────
queryClient.setMutationDefaults(['portal', 'registrar-comida'], {
  mutationFn: async (v) => {
    const { data, error } = await supabase.rpc('portal_registrar_comida', {
      p_token: v.token,
      p_momento: v.momento,
      p_descripcion: v.descripcion || null,
      p_kcal: v.kcal || 0,
      p_prot: v.proteina_g || 0,
      p_carb: v.carbos_g || 0,
      p_gra: v.grasas_g || 0,
      p_foto_url: v.foto_url || null,
      p_fecha: v.fecha
    })
    if (error) throw error
    return data
  },
  // Optimista: la comida aparece y los macros suman al instante (feedback offline;
  // evita el re-toque que duplicaba comidas por falta de confirmación).
  onMutate: async (v) => {
    const key = ['portal', 'nutricion', v.token, v.fecha]
    await queryClient.cancelQueries({ queryKey: key })
    const prev = queryClient.getQueryData(key)
    const kcal = v.kcal || 0, prot = v.proteina_g || 0, carb = v.carbos_g || 0, gra = v.grasas_g || 0
    queryClient.setQueryData(key, (old) => {
      if (!old) return old
      const comidas = old.comidas || []
      const con = old.consumido || { kcal: 0, proteina_g: 0, carbos_g: 0, grasas_g: 0 }
      return {
        ...old,
        comidas: [...comidas, {
          id: `optim-comida-${comidas.length}`,
          momento: v.momento,
          descripcion: v.descripcion || null,
          kcal, proteina_g: prot, carbos_g: carb, grasas_g: gra,
          foto_url: v.foto_url || null,
          _optimistic: true
        }],
        consumido: {
          kcal: con.kcal + kcal,
          proteina_g: con.proteina_g + prot,
          carbos_g: con.carbos_g + carb,
          grasas_g: con.grasas_g + gra
        }
      }
    })
    return { key, prev }
  },
  onError: (_e, _v, ctx) => { if (ctx?.prev !== undefined) queryClient.setQueryData(ctx.key, ctx.prev) },
  onSuccess: invalidarPortal
})
