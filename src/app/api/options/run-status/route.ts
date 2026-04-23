/**
 * GET /api/options/run-status
 * Returns current cache state: is there a run < 1hr old, and when is next available.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServiceClient()

  const { data: latestRun } = await supabase
    .from('analysis_runs')
    .select('id, completed_at, status')
    .eq('status', 'done')
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  if (!latestRun || !latestRun.completed_at) {
    return NextResponse.json({
      has_cached_run: false,
      run_id: null,
      completed_at: null,
      next_available_in_seconds: 0,
    })
  }

  const completedAt = new Date(latestRun.completed_at)
  const now = new Date()
  const ageMs = now.getTime() - completedAt.getTime()
  const oneHourMs = 60 * 60 * 1000

  if (ageMs < oneHourMs) {
    const remainingMs = oneHourMs - ageMs
    return NextResponse.json({
      has_cached_run: true,
      run_id: latestRun.id,
      completed_at: latestRun.completed_at,
      next_available_in_seconds: Math.ceil(remainingMs / 1000),
    })
  }

  return NextResponse.json({
    has_cached_run: false,
    run_id: latestRun.id,
    completed_at: latestRun.completed_at,
    next_available_in_seconds: 0,
  })
}
