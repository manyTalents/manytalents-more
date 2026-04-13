/**
 * Money API client — typed fetch wrappers for VEOE and Crypto bot APIs.
 * Both backends run on the same droplet behind Nginx reverse proxy.
 * Auth: Bearer token (shared DASHBOARD_TOKEN).
 */

import { getMoneyAuth } from "./money-auth";
import type {
  VEOESummary,
  VEOEEquityPoint,
  VEOETrade,
  VEOESignal,
  VEOEAlpha,
  VEOEConfig,
  VEOELearning,
  CryptoBalance,
  CryptoEquityPoint,
  CryptoPosition,
  CryptoTrade,
  CryptoStrategy,
  CryptoSignals,
  CryptoRisk,
  CryptoStats,
  CryptoLearning,
  CryptoWSUpdate,
} from "./money-types";

const BASE = process.env.NEXT_PUBLIC_MONEY_API || "https://money-api.manytalentsmore.com";

function getToken(): string {
  const auth = getMoneyAuth();
  if (!auth) throw new Error("Not authenticated");
  return auth.token;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: "application/json",
  };
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// ── VEOE Endpoints ──────────────────────────────

export const veoe = {
  summary: () => fetchJSON<VEOESummary>(`${BASE}/veoe/api/summary`),
  equity: () => fetchJSON<VEOEEquityPoint[]>(`${BASE}/veoe/api/equity`),
  trades: () => fetchJSON<VEOETrade[]>(`${BASE}/veoe/api/trades`),
  signals: () => fetchJSON<VEOESignal[]>(`${BASE}/veoe/api/signals`),
  alpha: () => fetchJSON<VEOEAlpha>(`${BASE}/veoe/api/alpha`),
  config: () => fetchJSON<VEOEConfig>(`${BASE}/veoe/api/config`),
  learning: () => fetchJSON<VEOELearning>(`${BASE}/veoe/api/learning`),
  health: () => fetchJSON<{ status: string }>(`${BASE}/veoe/api/health`),
};

// ── Crypto Endpoints ────────────────────────────

export const crypto = {
  balance: () => fetchJSON<CryptoBalance>(`${BASE}/crypto/api/balance`),
  equity: (days = 90) =>
    fetchJSON<CryptoEquityPoint[]>(`${BASE}/crypto/api/equity?days=${days}`),
  positions: () => fetchJSON<CryptoPosition[]>(`${BASE}/crypto/api/positions`),
  trades: (limit = 50, offset = 0) =>
    fetchJSON<CryptoTrade[]>(`${BASE}/crypto/api/trades?limit=${limit}&offset=${offset}`),
  strategies: () => fetchJSON<CryptoStrategy[]>(`${BASE}/crypto/api/strategies`),
  signals: () => fetchJSON<CryptoSignals>(`${BASE}/crypto/api/signals`),
  risk: () => fetchJSON<CryptoRisk>(`${BASE}/crypto/api/risk`),
  stats: () => fetchJSON<CryptoStats>(`${BASE}/crypto/api/stats`),
  learning: () => fetchJSON<CryptoLearning>(`${BASE}/crypto/api/learning`),
  health: () => fetchJSON<{ status: string }>(`${BASE}/crypto/api/health`),
};

// ── WebSocket ───────────────────────────────────

export function connectCryptoWS(
  onMessage: (data: CryptoWSUpdate) => void,
  onError?: (err: Event) => void
): WebSocket {
  const token = getToken();
  const wsBase = BASE.replace(/^http/, "ws");
  const ws = new WebSocket(`${wsBase}/crypto/ws/live?token=${token}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as CryptoWSUpdate;
      onMessage(data);
    } catch {
      // ignore malformed messages
    }
  };

  ws.onerror = (event) => {
    onError?.(event);
  };

  return ws;
}
