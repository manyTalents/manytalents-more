/**
 * POST /api/options/close/[id]
 * Proxies to the options-service droplet: POST /options/close/{id}
 * Injects X-Options-API-Key header.
 */

import { NextRequest, NextResponse } from 'next/server'

const MONEY_API = process.env.NEXT_PUBLIC_MONEY_API || 'https://money-api.manytalentsmore.com'
const OPTIONS_API_KEY = process.env.OPTIONS_API_KEY || ''

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const upstream = await fetch(`${MONEY_API}/options/close/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Options-API-Key': OPTIONS_API_KEY,
      },
    })

    const data = await upstream.json().catch(() => ({ detail: upstream.statusText }))

    return NextResponse.json(data, { status: upstream.status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream unreachable'
    return NextResponse.json({ detail: message }, { status: 502 })
  }
}
