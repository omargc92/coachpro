// ============================================================
// Fase D — Onboarding guiado: checklist de 3 pasos (primer login).
// Aparece como overlay hasta completar o saltar.
// Persiste en coaches.onboarding_completado.
// ============================================================
import { useState } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAtletasResumen, useCompletarOnboarding } from '../../lib/queries.js'
import { Card, Button, Icon } from '../../lib/ui.jsx'
import { colors, space, font, radius } from '../../lib/theme.js'

export function Onboarding({ coach, onComplete }) {
  const completar = useCompletarOnboarding()
  const { data: atletas } = useAtletasResumen(coach)
  const [step3Done, setStep3Done]   = useState(false)
  const [copiando, setCopiando]     = useState(false)

  const step1Done = !!coach.logo_url
  const step2Done = (atletas?.length ?? 0) > 0
  const steps = [step1Done, step2Done, step3Done]
  const completados = steps.filter(Boolean).length

  async function compartirLink() {
    setCopiando(true)
    const { data } = await supabase
      .from('atletas')
      .select('token')
      .eq('coach_id', coach.id)
      .eq('activo', true)
      .limit(1)
      .maybeSingle()
    setCopiando(false)
    if (!data) return
    const url = `${window.location.origin}/?token=${data.token}`
    try { await navigator.clipboard.writeText(url) } catch { window.prompt('Link del portal:', url) }
    setStep3Done(true)
  }

  function finalizar() {
    completar.mutate(coach.id, { onSuccess: onComplete })
  }

  // Auto-finaliza cuando los 3 están completos
  const allDone = completados === 3
  if (allDone && !completar.isPending && !completar.isSuccess) {
    completar.mutate(coach.id, { onSuccess: onComplete })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(11,11,13,0.92)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: `0 0 env(safe-area-inset-bottom)`
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <Card style={{ borderRadius: `${radius.lg}px ${radius.lg}px 0 0`, padding: space.lg, borderBottom: 'none' }}>
          {/* Encabezado */}
          <div style={{ textAlign: 'center', marginBottom: space.lg }}>
            <div style={{ ...font.title, fontSize: 19, fontWeight: 700, color: colors.title }}>
              ¡Bienvenido a CoachPro!
            </div>
            <div style={{ ...font.small, color: colors.muted, marginTop: 4 }}>
              Completa estos 3 pasos para aprovechar al máximo tu panel.
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{
            height: 4, background: colors.surface2, borderRadius: radius.pill, marginBottom: space.lg, overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round((completados / 3) * 100)}%`,
              background: colors.accent,
              borderRadius: radius.pill,
              transition: 'width 400ms ease'
            }} />
          </div>

          {/* Paso 1 */}
          <StepRow
            done={step1Done}
            num={1}
            title="Sube tu logo"
            subtitle="Personaliza la experiencia de tus atletas"
            action={
              !step1Done && (
                <button
                  onClick={() => {/* App maneja la nav via onComplete + setTab */}}
                  style={linkStyle}
                >
                  Ir a Configuración
                </button>
              )
            }
          />

          {/* Paso 2 */}
          <StepRow
            done={step2Done}
            num={2}
            title="Crea tu primer atleta"
            subtitle="Empieza a registrar progreso desde hoy"
            action={
              !step2Done && (
                <button onClick={finalizar} style={linkStyle}>
                  Hacerlo después
                </button>
              )
            }
          />

          {/* Paso 3 */}
          <StepRow
            done={step3Done}
            num={3}
            title="Comparte el link del portal"
            subtitle="Tu atleta accede sin registrarse"
            action={
              !step3Done && (
                <button
                  onClick={compartirLink}
                  disabled={!step2Done || copiando}
                  style={{ ...linkStyle, opacity: step2Done ? 1 : 0.4 }}
                >
                  {copiando ? 'Copiando…' : 'Copiar link'}
                </button>
              )
            }
          />

          {/* Acciones */}
          <div style={{ marginTop: space.lg, display: 'flex', flexDirection: 'column', gap: space.sm }}>
            {allDone ? (
              <Button onClick={finalizar} disabled={completar.isPending}>
                {completar.isPending ? 'Un momento…' : '¡Listo! Ir al panel'}
              </Button>
            ) : (
              <Button variant="ghost" onClick={finalizar} disabled={completar.isPending} style={{ color: colors.muted }}>
                Saltar por ahora
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

function StepRow({ done, num, title, subtitle, action }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: space.md,
      padding: `${space.sm}px 0`,
      borderBottom: `0.5px solid ${colors.border}`
    }}>
      {/* Indicador */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: done ? colors.accent : colors.surface2,
        border: `1.5px solid ${done ? colors.accent : colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2
      }}>
        {done
          ? <Icon name="check" size={15} color={colors.accentInk} />
          : <span style={{ ...font.small, fontWeight: 700, color: colors.muted, fontSize: 12 }}>{num}</span>
        }
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...font.body, fontWeight: done ? 400 : 600, color: done ? colors.muted : colors.title, textDecoration: done ? 'line-through' : 'none' }}>
          {title}
        </div>
        <div style={{ ...font.small, color: colors.hint, marginTop: 2 }}>{subtitle}</div>
      </div>

      {/* Acción */}
      {!done && action && (
        <div style={{ flexShrink: 0 }}>{action}</div>
      )}
    </div>
  )
}

const linkStyle = {
  background: 'transparent',
  border: `0.5px solid ${colors.border}`,
  borderRadius: radius.pill,
  color: colors.accent,
  fontSize: 11,
  fontWeight: 600,
  padding: '4px 12px',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
}
