/**
 * POST /api/options/checkout
 * Creates a Stripe Checkout session for one-time purchase or subscription.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

const PRICES: Record<number, number> = { 3: 499, 5: 598, 10: 697 }
const SUB_PRICE = 999 // $9.99/mo

export async function POST(req: NextRequest) {
  try {
    const { tier, mode } = await req.json()
    const stripe = getStripe()
    const origin = req.headers.get('origin') || 'https://manytalentsmore.com'

    if (mode === 'subscription') {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              recurring: { interval: 'month' },
              product_data: {
                name: 'MTM Options — Monthly (5 runs/day, all 10 picks)',
              },
              unit_amount: SUB_PRICE,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/money/options?session_id={CHECKOUT_SESSION_ID}&mode=subscription`,
        cancel_url: `${origin}/money/options`,
      })

      return NextResponse.json({ url: session.url })
    }

    // One-time payment
    const amount = PRICES[tier as number]
    if (!amount) {
      return NextResponse.json({ detail: 'Invalid tier' }, { status: 400 })
    }

    // Get the latest run_id to associate with this purchase
    const supabase = createServiceClient()
    const { data: latestRun } = await supabase
      .from('analysis_runs')
      .select('id')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `MTM Options — Top ${tier} Picks`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        tier: String(tier),
        run_id: latestRun?.id || '',
      },
      success_url: `${origin}/money/options?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${origin}/money/options`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ detail: message }, { status: 500 })
  }
}
