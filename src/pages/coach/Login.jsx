// ============================================================
// Login del COACH — email/password (Supabase Auth)
// ============================================================
import { useState } from 'react'
import { useAuth } from '../../lib/auth.jsx'
import { Screen, Card, Field, Button, Overline } from '../../lib/ui.jsx'
import { colors, space, font, radius } from '../../lib/theme.js'

export function Login() {
  const { signIn, signUp } = useAuth()
  const [modo, setModo] = useState('in') // 'in' | 'up'
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    const fn = modo === 'in' ? signIn : signUp
    const { error, data } = await fn(email.trim(), pass)
    setBusy(false)
    if (error) return setMsg({ type: 'err', text: error.message })
    if (modo === 'up' && !data.session)
      return setMsg({ type: 'ok', text: 'Cuenta creada. Revisa tu correo para confirmar, luego inicia sesión.' })
    // Si hay sesión, AuthProvider re-renderiza solo.
  }

  return (
    <Screen style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: space.md }}>
      <div style={{ textAlign: 'center', marginBottom: space.xl }}>
        <img
          src="/logo.png"
          alt="CoachPro"
          width={88}
          height={88}
          style={{ borderRadius: '50%', display: 'block', margin: '0 auto' }}
        />
        <h1 style={{ ...font.title, fontSize: 28, color: colors.title, margin: `${space.md}px 0 4px` }}>
          CoachPro
        </h1>
        <div style={{ ...font.small, color: colors.muted }}>Panel del entrenador</div>
      </div>

      <Card style={{ background: colors.surface }}>
        <form onSubmit={submit}>
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="coach@coachpro.app" />
          <Field label="Contraseña" type="password" value={pass} onChange={setPass} placeholder="••••••••" />

          {msg && (
            <div
              style={{
                ...font.small,
                color: msg.type === 'err' ? colors.danger : colors.accent,
                marginBottom: space.md
              }}
            >
              {msg.text}
            </div>
          )}

          <Button type="submit" disabled={busy || !email || !pass} icon={modo === 'in' ? 'login-2' : 'user-plus'}>
            {busy ? 'Un momento…' : modo === 'in' ? 'Entrar' : 'Crear cuenta'}
          </Button>
        </form>

        <div style={{ textAlign: 'center', marginTop: space.md }}>
          <button
            onClick={() => {
              setModo(modo === 'in' ? 'up' : 'in')
              setMsg(null)
            }}
            style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', ...font.small }}
          >
            {modo === 'in' ? '¿Primera vez? Crear cuenta' : '¿Ya tienes cuenta? Entrar'}
          </button>
        </div>
      </Card>

      <div style={{ textAlign: 'center', marginTop: space.lg }}>
        <Overline>Acceso de atletas por link · sin contraseña</Overline>
      </div>
    </Screen>
  )
}
