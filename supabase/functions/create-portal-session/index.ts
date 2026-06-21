// Edge Function: create-portal-session
// Abre el Customer Portal de Stripe para gestionar/cancelar suscripción.
// Env vars: STRIPE_SECRET_KEY, APP_URL
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient()
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) return new Response('Unauthorized', { status: 401 })

  const { data: coach } = await supabase
    .from('coaches')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!coach) return new Response('Coach no encontrado', { status: 404 })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('coach_id', coach.id)
    .single()

  if (!sub?.stripe_customer_id) {
    return new Response('Sin suscripción activa', { status: 400 })
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://coachpro-gray.vercel.app'

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: appUrl
  })

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json', ...cors() }
  })
})

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type'
  }
}
