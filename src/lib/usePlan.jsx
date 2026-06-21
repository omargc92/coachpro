// ============================================================
// Contexto de plan y entitlements del coach.
// Resuelve el plan efectivo (trial puede expirar en cliente),
// y provee helpers de gating a toda la app.
// ============================================================
import { createContext, useContext, useMemo } from 'react'
import { PLANS } from './plans.js'

const PlanCtx = createContext(null)

const DEFAULT = {
  plan: 'trial',
  isReadOnly: false,
  canWrite: true,
  isTrial: false,
  isExpired: false,
  daysLeftInTrial: null,
  hasFeature: () => true,
  canAddAthlete: () => true
}

export function PlanProvider({ subscription, children }) {
  const value = useMemo(() => {
    if (!subscription) return DEFAULT

    const now = Date.now()
    const trialEndsAt = new Date(subscription.trial_ends_at).getTime()
    const trialExpired = subscription.plan === 'trial' && now > trialEndsAt
    const effectivePlan = trialExpired ? 'expired' : subscription.plan
    const limits = PLANS[effectivePlan] ?? PLANS.expired

    const daysLeftInTrial =
      subscription.plan === 'trial' && !trialExpired
        ? Math.max(0, Math.ceil((trialEndsAt - now) / 86_400_000))
        : null

    return {
      plan: effectivePlan,
      rawPlan: subscription.plan,
      isReadOnly: !limits.canWrite,
      canWrite: limits.canWrite,
      isTrial: subscription.plan === 'trial' && !trialExpired,
      isExpired: effectivePlan === 'expired',
      daysLeftInTrial,
      trialEndsAt: subscription.trial_ends_at,
      hasFeature: (key) => limits.features[key] === true,
      canAddAthlete: (count) => limits.canWrite && count < limits.maxAthletes
    }
  }, [subscription])

  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>
}

export function usePlan() {
  return useContext(PlanCtx) ?? DEFAULT
}
