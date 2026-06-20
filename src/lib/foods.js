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
    fields: 'product_name,brands,nutriments',
    page_size: '24',
    sort_by: 'unique_scans_n' // primero los más conocidos
  })

  const res = await fetch(`${ENDPOINT}?${params}`, { signal })
  if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`)
  const json = await res.json()

  return (json.products || [])
    .map((p) => {
      const n = p.nutriments || {}
      const kcal = num(n['energy-kcal_100g'])
      // Sin calorías por 100 g no sirve para la app → se descarta.
      if (kcal == null) return null
      const nombre = (p.product_name || '').trim()
      if (!nombre) return null
      return {
        nombre,
        marca: (p.brands || '').split(',')[0]?.trim() || '',
        per100: {
          kcal: Math.round(kcal),
          prot: Math.round(num(n['proteins_100g']) || 0),
          carb: Math.round(num(n['carbohydrates_100g']) || 0),
          gra: Math.round(num(n['fat_100g']) || 0)
        }
      }
    })
    .filter(Boolean)
    .slice(0, 20)
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
