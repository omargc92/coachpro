// ============================================================
// Vercel Serverless Function — estima macros desde la foto del plato
// usando Claude (visión). La API key vive solo en el servidor.
//   POST /api/estimar-macros  { imageUrl }  →  { descripcion, kcal, ... }
// Requiere env ANTHROPIC_API_KEY en Vercel.
// ============================================================

const MODEL = 'claude-haiku-4-5-20251001' // visión, rápido y económico

const TOOL = {
  name: 'estimar_macros',
  description: 'Registra la estimación de macronutrientes del plato mostrado en la foto.',
  input_schema: {
    type: 'object',
    properties: {
      descripcion: { type: 'string', description: 'Nombre corto del plato en español, ej. "Pollo a la plancha con arroz y ensalada".' },
      kcal: { type: 'integer', description: 'Calorías totales estimadas de la PORCIÓN visible en el plato (no por 100 g).' },
      proteina_g: { type: 'integer', description: 'Proteína en gramos de la porción visible.' },
      carbos_g: { type: 'integer', description: 'Carbohidratos en gramos de la porción visible.' },
      grasas_g: { type: 'integer', description: 'Grasas en gramos de la porción visible.' },
      confianza: { type: 'string', enum: ['alta', 'media', 'baja'], description: 'Qué tan segura es la estimación.' }
    },
    required: ['descripcion', 'kcal', 'proteina_g', 'carbos_g', 'grasas_g', 'confianza']
  }
}

const PROMPT =
  'Analiza la foto de esta comida y estima los macronutrientes de la PORCIÓN VISIBLE en el plato ' +
  '(no por 100 g). Da números enteros realistas. Si la imagen no muestra comida, usa 0 en todo y ' +
  'confianza "baja". Responde únicamente llamando a la herramienta estimar_macros.'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    res.status(500).json({ error: 'El servidor no tiene configurada ANTHROPIC_API_KEY.' })
    return
  }
  const imageUrl = req.body && req.body.imageUrl
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
    res.status(400).json({ error: 'imageUrl inválida o ausente.' })
    return
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'estimar_macros' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'url', url: imageUrl } },
              { type: 'text', text: PROMPT }
            ]
          }
        ]
      })
    })

    const data = await r.json()
    if (!r.ok) {
      res.status(502).json({ error: 'La IA no está disponible.', detail: data && data.error && data.error.message })
      return
    }
    const tool = (data.content || []).find((c) => c.type === 'tool_use')
    if (!tool) {
      res.status(502).json({ error: 'La IA no devolvió una estimación.' })
      return
    }
    res.status(200).json(tool.input)
  } catch (e) {
    res.status(502).json({ error: String((e && e.message) || e) })
  }
}
