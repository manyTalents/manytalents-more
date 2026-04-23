/**
 * POST /api/options/admin-verify
 * Verifies the admin password for bypass access.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const valid = password === process.env.OPTIONS_ADMIN_PASSWORD

  return NextResponse.json({ valid })
}
