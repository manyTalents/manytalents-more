/**
 * POST /api/options/execute
 * Proxies to the options-service droplet: POST /options/execute
 * Forwards the request body and injects X-Options-API-Key.
 */

import { NextRequest, NextResponse } from 'next/server'

const MONEY_API = process.env.NEXT_PUBLIC_MONEY_API || 'https://money-api.manytalentsmore.com'
const OPTIONS_API_KEY = process.env.OPTIONS_API_KEY || ''

export async function POST(req: NextRequest) {
  // Auth check — require admin token or subscriber email
  const adminToken = req.headers.get('x-admin-token')
  const subEmail = req.headers.get('x-sub-email')
  if (adminToken !== process.env.OPTIONS_ADMIN_PASSWORD && !subEmail) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))

    const upstream = await fetch(`${MONEY_API}/options/execute`, {
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
