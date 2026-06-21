// Edge Function: stripe-webhook
// Procesa eventos de Stripe y actualiza subscriptions en Supabase.
// Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
//           STRIPE_PRICE_PRO, STRIPE_PRICE_PREMIUM
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient()
})
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function planFromPriceId(priceId: string): 'pro' | 'premium' | 'expired' {
  if (priceId === Deno.env.get('STRIPE_PRICE_PRO'))     return 'pro'
  if (priceId === Deno.env.get('STRIPE_PRICE_PREMIUM')) return 'premium'
  return 'expired'
}

async function updateSub(coachId: string, fields: Record<string, unknown>) {
  await supabase
    .from('subscriptions')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('coach_id', coachId)
}

async function coachIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('coach_id')
    .eq('stripe_customer_id', customerId)
    .single()
  return data?.coach_id ?? null
}

Deno.serve(async (req) => {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature invalid:', err)
    return new Response('Webhook Error', { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Pago de checkout completado ─────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break
        const coachId = (session.subscription_data?.metadata?.coach_id as string)
          ?? await coachIdFromCustomer(session.customer as string)
        if (!coachId) break

        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceId = sub.items.data[0]?.price.id
        const plan = planFromPriceId(priceId)

        await updateSub(coachId, {
          plan,
          status: 'active',
          stripe_customer_id:     session.customer,
          stripe_subscription_id: session.subscription,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        })
        break
      }

      // ── Suscripción actualizada (cambio de plan, renovación) ───────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const coachId = await coachIdFromCustomer(sub.customer as string)
        if (!coachId) break

        const priceId = sub.items.data[0]?.price.id
        const plan    = planFromPriceId(priceId)
        const active  = sub.status === 'active' || sub.status === 'trialing'

        await updateSub(coachId, {
          plan:   active ? plan : 'expired',
          status: active ? 'active' : 'read_only',
          stripe_subscription_id: sub.id,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        })
        break
      }

      // ── Suscripción cancelada ──────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const coachId = await coachIdFromCustomer(sub.customer as string)
        if (!coachId) break
        await updateSub(coachId, { plan: 'expired', status: 'read_only', current_period_end: null })
        break
      }

      // ── Pago confirmado (renovación mensual) ────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break
        const coachId = await coachIdFromCustomer(invoice.customer as string)
        if (!coachId) break

        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const priceId = sub.items.data[0]?.price.id
        const plan    = planFromPriceId(priceId)

        await updateSub(coachId, {
          plan,
          status: 'active',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString()
        })
        break
      }

      // ── Pago fallido (tras todos los reintentos) ────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // Solo caer a read_only si es el último intento
        if ((invoice.attempt_count ?? 0) < 3) break
        const coachId = await coachIdFromCustomer(invoice.customer as string)
        if (!coachId) break
        await updateSub(coachId, { status: 'read_only' })
        break
      }
    }
  } catch (err) {
    console.error('Error procesando webhook:', event.type, err)
    return new Response('Internal Error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
