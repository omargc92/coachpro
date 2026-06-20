// ============================================================
// Rotación de credenciales demo (requiere el SERVICE ROLE KEY de Supabase).
// NO se commitea ninguna credencial. Lee de variables de entorno.
//
//   SUPABASE_URL=...                (o se toma de .env.local: VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY=...   (god-key; NO la pongas en el repo)
//   NEW_COACH_PASS=...              (nueva contraseña del coach)
//   COACH_EMAIL=coach@coachpro.app  (opcional, default)
//
//   node scripts/rotar-credenciales.mjs
//
// Hace: 1) cambia la contraseña del coach (Auth admin API)
//       2) regenera el token de portal de cada atleta
//       3) imprime el token nuevo de Ana (para QA_TOKEN)
// ============================================================
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

function fromEnvFile(key) {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const line = txt.split('\n').find((l) => l.startsWith(key + '='))
    if (!line) return null
    // quita comillas envolventes (".env.local" suele guardar valores entre comillas)
    return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '')
  } catch {
    return null
  }
}

// Lee de process.env y, como fallback, de .env.local (gitignored → no se expone).
const URL_BASE = (process.env.SUPABASE_URL || fromEnvFile('VITE_SUPABASE_URL') || '').replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || fromEnvFile('SUPABASE_SERVICE_ROLE_KEY')
const NEW_PASS = process.env.NEW_COACH_PASS || fromEnvFile('NEW_COACH_PASS')
const COACH_EMAIL = process.env.COACH_EMAIL || fromEnvFile('COACH_EMAIL') || 'coach@coachpro.app'

if (!URL_BASE || !SERVICE || !NEW_PASS) {
  console.error('Faltan variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y NEW_COACH_PASS son obligatorias.')
  process.exit(1)
}

const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' }

async function main() {
  // 1) Coach: localizar por email y cambiar contraseña
  const ures = await fetch(`${URL_BASE}/auth/v1/admin/users?per_page=200`, { headers: H })
  const ujson = await ures.json()
  if (!ures.ok) throw new Error('admin/users: ' + JSON.stringify(ujson))
  const coach = (ujson.users || []).find((u) => u.email === COACH_EMAIL)
  if (!coach) throw new Error(`No se encontró el usuario ${COACH_EMAIL}`)
  const pres = await fetch(`${URL_BASE}/auth/v1/admin/users/${coach.id}`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ password: NEW_PASS })
  })
  if (!pres.ok) throw new Error('cambio de pass: ' + (await pres.text()))
  console.log(`✓ Contraseña del coach (${COACH_EMAIL}) actualizada.`)

  // 2) Atletas: regenerar token de cada uno (service role salta RLS)
  const ares = await fetch(`${URL_BASE}/rest/v1/atletas?select=id,nombre`, { headers: H })
  const atletas = await ares.json()
  if (!ares.ok) throw new Error('listar atletas: ' + JSON.stringify(atletas))
  let ana = null
  for (const a of atletas) {
    const token = randomUUID()
    const r = await fetch(`${URL_BASE}/rest/v1/atletas?id=eq.${a.id}`, {
      method: 'PATCH',
      headers: { ...H, Prefer: 'return=minimal' },
      body: JSON.stringify({ token })
    })
    if (!r.ok) throw new Error(`token ${a.nombre}: ` + (await r.text()))
    if (/ana/i.test(a.nombre)) ana = { nombre: a.nombre, token }
  }
  console.log(`✓ Tokens regenerados para ${atletas.length} atletas.`)
  if (ana) console.log(`\n  Token nuevo de ${ana.nombre} (para QA_TOKEN y el link demo):\n  ${ana.token}\n`)
  console.log('Siguiente: define los GitHub Secrets y actualiza los placeholders (ver SECURITY.md).')
}

main().catch((e) => {
  console.error('✗ Error en la rotación:', e.message)
  process.exit(1)
})
