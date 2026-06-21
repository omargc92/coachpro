Fase C — Stripe Billing (suscripciones recurrentes) sobre la estructura de Fase B

Contexto: continúa de Fase B. Ya existe el modelo de planes, estados y gating con flag manual. Ahora conectamos el cobro REAL con Stripe Billing en MXN. Reusar el patrón de Edge Functions de Stripe que ya implementé en otro proyecto (FútbolPro).

1) Stripe (configuración):
- Crea Products y Prices recurrentes en Stripe para Pro ($299 MXN/mes) y Premium ($599 MXN/mes). Documenta los price IDs y dónde van (variables de entorno, NO hardcodeadas).
- Usa Stripe Billing + Customer Portal (no pagos únicos).

2) Edge Functions (Supabase, con service role):
- create-checkout-session: recibe el plan elegido, crea/recupera el stripe_customer del coach, genera una Checkout Session de suscripción, devuelve la URL. (No maneja tarjetas en tu front — Stripe Checkout lo hace.)
- create-portal-session: genera una sesión del Customer Portal de Stripe para que el coach gestione/cancele su suscripción y métodos de pago.
- stripe-webhook: endpoint que verifica la firma del webhook y procesa: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.paid, invoice.payment_failed. Actualiza la tabla subscriptions (plan, status, current_period_end, stripe_*). 
  - invoice.paid → status=active, set plan según price.
  - subscription.deleted o payment_failed (tras reintentos) → status=read_only (cae a estado read-only de Fase B).

3) Conexión con la UI:
- En la pantalla de Planes (Fase B), el botón "Elegir plan" ahora llama a create-checkout-session y redirige a Stripe Checkout.
- Agrega botón "Gestionar suscripción" que llame a create-portal-session (para coaches con plan activo).
- Maneja el retorno de Checkout (success_url / cancel_url) con feedback claro. La verdad del plan llega por webhook, no por el redirect — muestra un estado "confirmando tu pago…" si el webhook aún no llegó.

4) Seguridad:
- NUNCA pongas claves secretas de Stripe en el cliente. Solo la publishable key si hace falta. Las secret keys y el webhook signing secret van en variables de entorno de las Edge Functions.
- El webhook DEBE verificar la firma de Stripe antes de procesar.
- El cambio de plan solo ocurre vía webhook (service role), nunca desde el cliente. Elimina o protege la Edge Function manual "set_plan_manual" de Fase B (déjala solo para entornos de dev, o bórrala).

5) Pruebas:
- Documenta cómo probar con tarjetas de test de Stripe el flujo completo: trial → checkout → pago → plan activo → cancelar en portal → caída a read-only.

Reglas: inline styles en el front, sin Tailwind. No expongas secretos. Documenta price IDs, env vars necesarias, y el flujo de webhooks. Build + deploy. Recuerda que Supabase está en plan que limita emails/hora — las notificaciones transaccionales reales (recibo, fallo de pago) conviene moverlas a Resend si las agregas.