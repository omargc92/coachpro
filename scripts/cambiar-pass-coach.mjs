// ============================================================
// Cambia SOLO la contraseña de un usuario (coach) vía Auth Admin API.
// No toca tokens de atletas ni ningún otro dato.
//
//   SUPABASE_URL=...                 (o de .env.local: VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY=...    (god-key; NO commitear)
//   NEW_COACH_PASS=...               (nueva contraseña)
//   COACH_EMAIL=coach@coachpro.app   (opcional, default)
//
//   node scripts/cambiar-pass-coach.mjs
// ============================================================
import { readFileSync } from 'node:fs'

function fromEnvFile(key) {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const line = txt.split('\n').find((l) => l.startsWith(key + '='))
    if (!line) return null
    return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '')
  } catch {
    return null
  }
}

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
  console.log(`✓ Contraseña de ${COACH_EMAIL} actualizada. (Ningún token fue modificado.)`)
}

main().catch((e) => {
  console.error('✗ Error:', e.message)
  process.exit(1)
})
