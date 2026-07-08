// ============================================================
// Fase D — Landing pública con precios.
// Visible a usuarios no autenticados. Incluye auth inline.
// SEO: ver index.html (title, description, JSON-LD).
// ============================================================
import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { Screen, Card, Field, Button, Icon } from '../lib/ui.jsx'
import { colors, space, font, radius } from '../lib/theme.js'
import { PLANS, PLAN_FEATURES_LABELS } from '../lib/plans.js'

const PLAN_ORDER = ['trial', 'fit', 'pro', 'premium']

export function Landing() {
  const { signIn, signUp } = useAuth()
  const [modo, setModo]   = useState(null)  // null | 'up' | 'in'
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [msg, setMsg]     = useState(null)
  const [busy, setBusy]   = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    setBusy(true)
    const fn = modo === 'in' ? signIn : signUp
    const { error, data } = await fn(email.trim(), pass)
    setBusy(false)
    if (error) return setMsg({ type: 'err', text: error.message })
    if (modo === 'up' && !data?.session)
      return setMsg({ type: 'ok', text: 'Cuenta creada. Revisa tu correo para confirmar, luego inicia sesión.' })
  }

  return (
    <Screen style={{ paddingBottom: space.xl }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: `${space.xl}px ${space.md}px ${space.lg}px` }}>
        <img
          src="/logo.png"
          alt="CoachPro"
          width={80}
          height={80}
          style={{ borderRadius: '50%', display: 'block', margin: '0 auto' }}
        />
        <h1 style={{ ...font.title, fontSize: 28, color: colors.title, margin: `${space.md}px 0 ${space.sm}px`, letterSpacing: '-0.02em' }}>
          CoachPro
        </h1>
        <p style={{ ...font.body, color: colors.muted, margin: `0 0 ${space.lg}px`, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Gestiona rutinas, nutrición y progreso de tus atletas. Todo desde el celular.
        </p>

        {!modo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm, maxWidth: 280, margin: '0 auto' }}>
            <Button onClick={() => setModo('up')} icon="user-plus">
              Empieza gratis 14 días
            </Button>
            <button
              onClick={() => setModo('in')}
              style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', ...font.small, padding: space.sm }}
            >
              Ya tengo cuenta — Iniciar sesión
            </button>
          </div>
        )}
      </div>

      {/* Formulario de auth */}
      {modo && (
        <Card style={{ marginBottom: space.lg, background: colors.surface }}>
          <div style={{ ...font.title, fontSize: 16, fontWeight: 700, color: colors.title, marginBottom: space.md, textAlign: 'center' }}>
            {modo === 'up' ? 'Crear cuenta gratis' : 'Iniciar sesión'}
          </div>
          <form onSubmit={submit}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="coach@email.com" />
            <Field label="Contraseña" type="password" value={pass} onChange={setPass} placeholder="••••••••" />

            {msg && (
              <div style={{ ...font.small, color: msg.type === 'err' ? colors.danger : colors.accent, marginBottom: space.md }}>
                {msg.text}
              </div>
            )}

            <Button type="submit" disabled={busy || !email || !pass} icon={modo === 'in' ? 'login-2' : 'user-plus'}>
              {busy ? 'Un momento…' : modo === 'in' ? 'Entrar' : 'Crear cuenta'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: space.md, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => { setModo(modo === 'in' ? 'up' : 'in'); setMsg(null) }}
              style={{ background: 'transparent', border: 'none', color: colors.muted, cursor: 'pointer', ...font.small }}
            >
              {modo === 'in' ? '¿Primera vez? Crear cuenta' : '¿Ya tienes cuenta? Entrar'}
            </button>
            <button
              onClick={() => { setModo(null); setMsg(null) }}
              style={{ background: 'transparent', border: 'none', color: colors.hint, cursor: 'pointer', ...font.small }}
            >
              Cancelar
            </button>
          </div>
        </Card>
      )}

      {/* Sección de precios */}
      <div style={{ ...font.overline, color: colors.muted, textAlign: 'center', marginBottom: space.md, letterSpacing: '1.8px', fontSize: 10.5 }}>
        PLANES Y PRECIOS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm, marginBottom: space.lg }}>
        {PLAN_ORDER.map(key => {
          const p = PLANS[key]
          const isPro = key === 'premium'
          return (
            <Card
              key={key}
              style={{ position: 'relative', overflow: 'visible', borderColor: isPro ? colors.accent : colors.border }}
            >
              {isPro && (
                <div style={{ position: 'absolute', top: -10, right: space.md }}>
                  <span style={{
                    background: colors.accent, color: colors.accentInk,
                    fontSize: 10, fontWeight: 700, padding: '2px 10px',
                    borderRadius: radius.pill, letterSpacing: '0.05em'
                  }}>
                    MÁS POPULAR
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.md }}>
                <div>
                  <div style={{ ...font.title, fontSize: 17, fontWeight: 700, color: colors.title }}>{p.label}</div>
                  <div style={{ ...font.small, color: colors.muted, marginTop: 2 }}>
                    {key === 'trial'
                      ? 'Sin tarjeta requerida'
                      : p.maxAthletes === Infinity ? 'Atletas ilimitados' : `Hasta ${p.maxAthletes} atletas`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {key === 'trial'
                    ? <div style={{ ...font.title, fontSize: 20, color: colors.accent, fontWeight: 700 }}>Gratis</div>
                    : <>
                        <div style={{ ...font.number, fontSize: 24, color: colors.accent, lineHeight: 1 }}>${p.price}</div>
                        <div style={{ ...font.small, color: colors.hint }}>MXN/mes</div>
                      </>
                  }
                </div>
              </div>

              {Object.entries(PLAN_FEATURES_LABELS).map(([fk, label]) => (
                <div key={fk} style={{ display: 'flex', alignItems: 'center', gap: space.sm, marginBottom: 6 }}>
                  <Icon
                    name={p.features[fk] ? 'circle-check' : 'circle-x'}
                    size={15}
                    color={p.features[fk] ? colors.accent : colors.hint}
                  />
                  <span style={{ ...font.small, color: p.features[fk] ? colors.body : colors.hint }}>{label}</span>
                </div>
              ))}

              {key === 'trial' && (
                <div style={{ ...font.small, color: colors.muted, marginTop: space.sm, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={13} color={colors.muted} />
                  14 días con todo Pro desbloqueado
                </div>
              )}

              {key === 'trial' && !modo && (
                <Button onClick={() => setModo('up')} style={{ marginTop: space.md }}>
                  Empezar gratis
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', ...font.small, color: colors.hint, lineHeight: 1.7 }}>
        Pagos seguros vía Stripe · Cancela cuando quieras
        <br />
        Atletas acceden gratis por link — sin registrarse
      </div>
    </Screen>
  )
}
