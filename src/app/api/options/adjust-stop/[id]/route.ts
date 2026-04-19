/**
 * POST /api/options/adjust-stop/[id]
 * Proxies to the options-service droplet: POST /options/adjust-stop/{id}
 * Forwards trailing_pct body and injects X-Options-API-Key.
 */

import { NextRequest, NextResponse } from 'next/server'

const MONEY_API = process.env.NEXT_PUBLIC_MONEY_API || 'https://money-api.manytalentsmore.com'
const OPTIONS_API_KEY = process.env.OPTIONS_API_KEY || ''

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))

    const upstream = await fetch(`${MONEY_API}/options/adjust-stop/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Options-API-Key': OPTIONS_API_KEY,
      },
      body: JSON.stringify(body),
    })

    const data = await upstream.json().catch(() => ({ detail: upstream.statusText }))

    return NextResponse.json(data, { status: upstream.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream unreachable'
    return NextResponse.json({ detail: message }, { status: 502 })
  }
}
