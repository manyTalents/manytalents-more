/**
 * POST /api/options/webhook
 * Stripe webhook handler — records purchases and manages subscriptions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ detail: 'Missing signature' }, { status: 400 })
  }

  const stripe = getStripe()
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ detail: message }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode === 'payment') {
        const tier = parseInt(session.metadata?.tier || '3', 10)
        const runId = session.metadata?.run_id || null

        await supabase.from('purchases').insert({
          stripe_session_id: session.id,
          email: session.customer_details?.email || null,
          run_id: runId,
          tier,
          amount_cents: session.amount_total || 0,
        })
      } else if (session.mode === 'subscription') {
        const email = session.customer_details?.email
        const customerId = session.customer as string

        if (email && customerId) {
          await supabase.from('subscribers').upsert(
            {
              email,
              stripe_customer_id: customerId,
              status: 'active',
              runs_today: 0,
            },
            { onConflict: 'email' }
          )
        }
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const status = sub.status === 'active' ? 'active' : 'cancelled'

      await supabase
        .from('subscribers')
        .update({ status })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
