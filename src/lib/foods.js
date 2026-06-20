// ============================================================
// Búsqueda de alimentos vía Open Food Facts (API pública, sin key).
// Devuelve macros por 100 g; el componente escala según la cantidad.
// ============================================================

const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/search'

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Busca alimentos por texto. Devuelve [{ nombre, marca, per100: {kcal, prot, carb, gra} }].
export async function buscarAlimentos(query, { signal } = {}) {
  const q = query.trim()
  if (!q) return []

  const params = new URLSearchParams({
    search_terms: q,
    // Pedimos también el nombre localizado en español y el genérico.
    fields: 'product_name,product_name_es,generic_name_es,brands,nutriments',
    page_size: '50', // pedimos de más: filtramos ruido y recortamos a 20
    sort_by: 'unique_scans_n', // primero los más conocidos
    lc: 'es' // idioma de preferencia → nombres en español cuando existen
  })

  const res = await fetch(`${ENDPOINT}?${params}`, { signal })
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const json = await res.json()

  const vistos = new Set()
  return (json.products || [])
    .map((p) => {
      const n = p.nutriments || {}
      const kcal = num(n['energy-kcal_100g'])
      // Descarta ruido: sin energía o 0 kcal (aguas, productos sin datos útiles).
      if (kcal == null || kcal <= 0) return null
      const nombre = (p.product_name_es || p.generic_name_es || p.product_name || '').trim()
      if (!nombre) return null
      // Dedup por nombre normalizado.
      const clave = nombre.toLowerCase()
      if (vistos.has(clave)) return null
      vistos.add(clave)
      const prot = num(n['proteins_100g'])
      const carb = num(n['carbohydrates_100g'])
      const gra = num(n['fat_100g'])
      return {
        nombre,
        marca: (p.brands || '').split(',')[0]?.trim() || '',
        // Completitud de macros: prioriza entradas con datos completos.
        completos: [prot, carb, gra].filter((x) => x != null).length,
        per100: {
          kcal: Math.round(kcal),
          prot: Math.round(prot || 0),
          carb: Math.round(carb || 0),
          gra: Math.round(gra || 0)
        }
      }
    })
    .filter(Boolean)
    // Estable: respeta popularidad (orden OFF) pero sube los de macros completos.
    .sort((a, b) => b.completos - a.completos)
    .slice(0, 20)
    .map(({ completos, ...rest }) => rest)
}

// Escala los macros de 100 g a la cantidad dada (en g), redondeando.
export function escalarMacros(per100, gramos) {
  const f = (Number(gramos) || 0) / 100
  return {
    kcal: Math.round(per100.kcal * f),
    proteina_g: Math.round(per100.prot * f),
    carbos_g: Math.round(per100.carb * f),
    grasas_g: Math.round(per100.gra * f)
  }
}
