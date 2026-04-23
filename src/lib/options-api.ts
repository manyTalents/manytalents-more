/**
 * Options API client — fetch wrappers for the options-service FastAPI backend
 * and new monetization endpoints.
 */

import type {
  AnalyzeResponse,
  ExecuteResponse,
  CloseResponse,
  CheckoutResponse,
  RunStatus,
  Tier,
} from './options-types'

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
  // ── Existing (trading) ──────────────────────────────────────────────────────
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

  // ── Monetization ────────────────────────────────────────────────────────────
  checkout: (tier: Tier, mode: 'one_time' | 'subscription') =>
    fetchApi<CheckoutResponse>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier, mode }),
    }),

  getRunStatus: () => fetchApi<RunStatus>('/run-status'),

  getRecommendations: (params: {
    sessionId?: string
    adminToken?: string
    subEmail?: string
  }) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (params.adminToken) headers['x-admin-token'] = params.adminToken
    if (params.subEmail) headers['x-sub-email'] = params.subEmail
    const qs = params.sessionId ? `?session_id=${params.sessionId}` : ''
    return fetch(`${API_BASE}/recommendations${qs}`, { headers }).then(r => r.json())
  },

  verifyAdmin: (password: string) =>
    fetchApi<{ valid: boolean }>('/admin-verify', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
}
