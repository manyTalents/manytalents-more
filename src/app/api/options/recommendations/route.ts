/**
 * GET /api/options/recommendations?session_id=xxx
 * Returns gated recommendation data based on purchase verification.
 * Handles admin, subscriber, and one-time purchase access.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')
  const adminToken = req.headers.get('x-admin-token')
  const subEmail = req.headers.get('x-sub-email')

  const supabase = createServiceClient()

  // Get latest completed run
  const { data: latestRun } = await supabase
    .from('analysis_runs')
    .select('id, completed_at')
    .eq('status', 'done')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (!latestRun) {
    return NextResponse.json({ detail: 'No analysis available' }, { status: 404 })
  }

  // Determine access level
  let tier = 0

  // Admin bypass
  if (adminToken === process.env.OPTIONS_ADMIN_PASSWORD) {
    tier = 10
  }
  // Subscriber access
  else if (subEmail) {
    const { data: sub } = await supabase
      .from('subscribers')
      .select('status, runs_today, last_run_date')
      .eq('email', subEmail)
      .eq('status', 'active')
      .single()

    if (sub) {
      const today = new Date().toISOString().split('T')[0]
      const runsToday = sub.last_run_date === today ? sub.runs_today : 0

      if (runsToday < 5) {
        tier = 10
        await supabase
          .from('subscribers')
          .update({
            runs_today: runsToday + 1,
            last_run_date: today,
          })
          .eq('email', subEmail)
      } else {
        return NextResponse.json(
          { detail: 'Daily run limit reached (5/5). Resets at midnight ET.' },
          { status: 429 }
        )
      }
    }
  }
  // One-time purchase via Stripe session
  else if (sessionId) {
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (session.payment_status === 'paid') {
        tier = parseInt(session.metadata?.tier || '3', 10)
      }
    } catch {
      return NextResponse.json({ detail: 'Invalid session' }, { status: 401 })
    }
  }

  if (tier === 0) {
    return NextResponse.json({ detail: 'Payment required' }, { status: 402 })
  }

  // Fetch recommendations up to tier limit
  const { data: recs } = await supabase
    .from('recommendations')
    .select('*')
    .eq('run_id', latestRun.id)
    .order('rank', { ascending: true })
    .limit(tier)

  return NextResponse.json({
    tier,
    recommendations: recs || [],
    run_id: latestRun.id,
    completed_at: latestRun.completed_at,
  })
}
