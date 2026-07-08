// Edge Function: create-checkout-session
// Crea una Stripe Checkout Session para Pro o Premium.
// Env vars requeridas en Supabase Dashboard → Edge Functions → Secrets:
//   STRIPE_SECRET_KEY, STRIPE_PRICE_FIT, STRIPE_PRICE_PRO, STRIPE_PRICE_PREMIUM, APP_URL
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient()
})

const PRICE_IDS: Record<string, string> = {
  fit:     Deno.env.get('STRIPE_PRICE_FIT')!,
  pro:     Deno.env.get('STRIPE_PRICE_PRO')!,
  premium: Deno.env.get('STRIPE_PRICE_PREMIUM')!
}

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

  const { plan } = await req.json().catch(() => ({}))
  const priceId = PRICE_IDS[plan]
  if (!priceId) return new Response('Plan inválido', { status: 400 })

  // Obtener coach y su suscripción
  const { data: coach } = await supabase
    .from('coaches')
    .select('id, email, nombre')
    .eq('auth_user_id', user.id)
    .single()
  if (!coach) return new Response('Coach no encontrado', { status: 404 })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('coach_id', coach.id)
    .single()

  // Crear o reutilizar Stripe Customer
  let customerId = sub?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: coach.email,
      name: coach.nombre,
      metadata: { coach_id: coach.id }
    })
    customerId = customer.id
    await supabase
      .from('subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('coach_id', coach.id)
  }

  const appUrl = Deno.env.get('APP_URL') || 'https://coachpro-gray.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}?checkout=success`,
    cancel_url:  `${appUrl}?checkout=cancelled`,
    subscription_data: {
      metadata: { coach_id: coach.id }
    },
    locale: 'es'
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
