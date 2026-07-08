// ============================================================
// Fase C — Pantalla de planes con Stripe Billing
// ============================================================
import { useState } from 'react'
import { Screen, Header, Card, Button, Overline, Icon, Loading } from '../../lib/ui.jsx'
import { colors, space, font, radius } from '../../lib/theme.js'
import { usePlan } from '../../lib/usePlan.jsx'
import { PLANS, PLAN_FEATURES_LABELS } from '../../lib/plans.js'
import { supabase } from '../../lib/supabase.js'

const PLAN_ORDER = ['fit', 'pro', 'premium']

export function Planes() {
  const plan = usePlan()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState(null)

  async function handleElegirPlan(p) {
    setLoading(p)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan: p }
      })
      if (fnErr) throw fnErr
      if (!data?.url) throw new Error('No se recibió URL de checkout')
      window.location.href = data.url
    } catch (err) {
      setError('Error al iniciar el pago: ' + (err.message || err))
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-portal-session', {})
      if (fnErr) throw fnErr
      if (!data?.url) throw new Error('No se recibió URL del portal')
      window.location.href = data.url
    } catch (err) {
      setError('Error al abrir el portal: ' + (err.message || err))
      setLoading(null)
    }
  }

  const tieneSuscripcionActiva = plan.plan === 'fit' || plan.plan === 'pro' || plan.plan === 'premium'

  return (
    <Screen>
      <Header title="Planes" subtitle="Elige tu plan" />

      {/* Estado actual */}
      <PlanStatusBanner plan={plan} />

      {/* Botón gestionar suscripción (Pro/Premium activos) */}
      {tieneSuscripcionActiva && (
        <Button
          variant="ghost"
          icon="settings"
          onClick={handlePortal}
          disabled={loading === 'portal'}
          style={{ marginBottom: space.lg }}
        >
          {loading === 'portal' ? 'Abriendo portal…' : 'Gestionar suscripción'}
        </Button>
      )}

      {error && (
        <div style={{ ...font.small, color: colors.danger, marginBottom: space.md, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="alert-circle" size={15} color={colors.danger} />
          {error}
        </div>
      )}

      {/* Tarjetas de plan */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.md, marginBottom: space.lg }}>
        {/* Trial / Free — informativo, sin CTA de compra */}
        <Card style={{ borderColor: plan.isTrial ? colors.accent : colors.border, opacity: 0.7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}>
            <div>
              <div style={{ ...font.title, fontSize: 17, fontWeight: 700, color: colors.title }}>Trial</div>
              <div style={{ ...font.small, color: colors.muted }}>14 días gratis</div>
            </div>
            {plan.isTrial && <PlanBadge label="ACTUAL" />}
          </div>
          <FeatureRow label="Hasta 3 atletas" enabled />
          <FeatureRow label="Features Pro desbloqueadas temporalmente" enabled />
        </Card>

        {/* Pro y Premium */}
        {PLAN_ORDER.map((key) => {
          const p = PLANS[key]
          const isCurrent = plan.plan === key
          return (
            <Card
              key={key}
              style={{ borderColor: isCurrent ? colors.accent : colors.border, position: 'relative', overflow: 'visible' }}
            >
              {isCurrent && (
                <div style={{ position: 'absolute', top: -10, right: space.md }}>
                  <PlanBadge label="PLAN ACTUAL" />
                </div>
              )}
              {key === 'premium' && !isCurrent && (
                <div style={{ position: 'absolute', top: -10, right: space.md }}>
                  <PlanBadge label="RECOMENDADO" color={colors.info} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: space.md }}>
                <div>
                  <div style={{ ...font.title, fontSize: 18, fontWeight: 700, color: colors.title }}>{p.label}</div>
                  <div style={{ ...font.small, color: colors.muted, marginTop: 2 }}>
                    {p.maxAthletes === Infinity ? 'Atletas ilimitados' : `Hasta ${p.maxAthletes} atletas`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ ...font.number, fontSize: 26, color: colors.accent, lineHeight: 1 }}>${p.price}</div>
                  <div style={{ ...font.small, color: colors.hint }}>MXN/mes</div>
                </div>
              </div>

              {Object.entries(PLAN_FEATURES_LABELS).map(([fk, label]) => (
                <FeatureRow key={fk} label={label} enabled={p.features[fk]} />
              ))}

              {!isCurrent && (
                <Button
                  onClick={() => handleElegirPlan(key)}
                  disabled={!!loading}
                  variant={key === 'premium' ? 'primary' : 'ghost'}
                  style={{ marginTop: space.md }}
                >
                  {loading === key
                    ? 'Redirigiendo a Stripe…'
                    : `Suscribirse a ${p.label}`
                  }
                </Button>
              )}
            </Card>
          )
        })}
      </div>

      <div style={{ ...font.small, color: colors.hint, textAlign: 'center', lineHeight: 1.5 }}>
        Pagos procesados de forma segura por Stripe.{'\n'}
        Cancela cuando quieras desde el portal de suscripción.
      </div>
    </Screen>
  )
}

// ── Componentes auxiliares ────────────────────────────────────

function PlanStatusBanner({ plan }) {
  if (!plan.isTrial && !plan.isExpired) return null

  const isExpired = plan.isExpired
  const urgent    = plan.isTrial && plan.daysLeftInTrial <= 3

  return (
    <Card
      style={{
        marginBottom: space.lg,
        borderColor: isExpired || urgent ? colors.danger : colors.accent,
        background: isExpired ? 'rgba(255,120,71,0.08)' : 'rgba(216,255,62,0.06)'
      }}
    >
      <div style={{ display: 'flex', gap: space.sm, alignItems: 'center' }}>
        <Icon
          name={isExpired ? 'alert-triangle' : 'clock'}
          size={20}
          color={isExpired || urgent ? colors.danger : colors.accent}
        />
        <div>
          <div style={{ ...font.body, fontWeight: 600, color: colors.title }}>
            {isExpired
              ? 'Tu periodo de prueba terminó'
              : `Te quedan ${plan.daysLeftInTrial} día${plan.daysLeftInTrial !== 1 ? 's' : ''} de prueba`}
          </div>
          <div style={{ ...font.small, color: colors.muted }}>
            {isExpired
              ? 'Elige un plan para seguir operando'
              : 'Elige un plan antes de que expire'}
          </div>
        </div>
      </div>
    </Card>
  )
}

function PlanBadge({ label, color = colors.accent }) {
  return (
    <span style={{
      background: color, color: color === colors.accent ? colors.accentInk : '#fff',
      fontSize: 10, fontWeight: 700, padding: '2px 10px',
      borderRadius: radius.pill, letterSpacing: '0.05em'
    }}>
      {label}
    </span>
  )
}

function FeatureRow({ label, enabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space.sm, marginBottom: 8 }}>
      <Icon name={enabled ? 'circle-check' : 'circle-x'} size={16} color={enabled ? colors.accent : colors.hint} />
      <span style={{ ...font.small, color: enabled ? colors.body : colors.hint }}>{label}</span>
    </div>
  )
}
