// Edge Function: set-plan-manual  ⚠️  SOLO DEV
// Permite cambiar el plan sin Stripe. Bloqueada por defecto (fail-closed):
// solo opera si el secret ALLOW_MANUAL_PLAN === 'true' está presente.
// En prod NO lo configures → los cambios de plan SOLO ocurren vía stripe-webhook.
// Deploy: supabase functions deploy set-plan-manual
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VALID_PLANS = ['trial', 'expired', 'fit', 'pro', 'premium']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type'
      }
    })
  }

  // Fail-closed: deshabilitada salvo que se habilite explícitamente en dev.
  if (Deno.env.get('ALLOW_MANUAL_PLAN') !== 'true') {
    return new Response('Forbidden', { status: 403 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Verifica JWT del coach
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  const { plan } = await req.json().catch(() => ({}))
  if (!VALID_PLANS.includes(plan)) {
    return new Response('Plan inválido', { status: 400 })
  }

  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!coach) return new Response('Coach no encontrado', { status: 404 })

  const now = new Date()
  const update: Record<string, unknown> = {
    plan,
    status: plan === 'expired' ? 'read_only' : 'active',
    updated_at: now.toISOString()
  }
  if (plan === 'trial') {
    update.trial_ends_at = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(update)
    .eq('coach_id', coach.id)

  if (error) return new Response(error.message, { status: 500 })

  return new Response(JSON.stringify({ ok: true, plan }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
})
