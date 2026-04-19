/**
 * Options API client — fetch wrappers for the options-service FastAPI backend.
 * All requests are proxied through Next.js API routes (Vercel → droplet).
 */

import type { AnalyzeResponse, ExecuteResponse, CloseResponse } from './options-types'

const API_BASE = '/api/options'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || 'Request failed')
  }
  return res.json()
}

export const optionsApi = {
  analyze: () => fetchApi<AnalyzeResponse>('/analyze', { method: 'POST' }),

  execute: (req: { recommendation_id: string; quantity: number }) =>
    fetchApi<ExecuteResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify(req),
    }),

  close: (positionId: string) =>
    fetchApi<CloseResponse>(`/close/${positionId}`, { method: 'POST' }),

  adjustStop: (positionId: string, trailingPct: number) =>
    fetchApi<{ status: string }>(`/adjust-stop/${positionId}`, {
      method: 'POST',
      body: JSON.stringify({ trailing_pct: trailingPct }),
    }),
}
