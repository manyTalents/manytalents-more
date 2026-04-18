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
  equity: async () => {
    const res = await fetchJSON<{ points: VEOEEquityPoint[] }>(`${BASE}/veoe/api/equity`);
    return res.points || [];
  },
  trades: async () => {
    const res = await fetchJSON<{ trades: VEOETrade[] }>(`${BASE}/veoe/api/trades`);
    return res.trades || [];
  },
  signals: async () => {
    const res = await fetchJSON<{ signals: VEOESignal[] }>(`${BASE}/veoe/api/signals`);
    return res.signals || [];
  },
  alpha: () => fetchJSON<VEOEAlpha>(`${BASE}/veoe/api/alpha`),
  config: () => fetchJSON<VEOEConfig>(`${BASE}/veoe/api/config`),
  learning: () => fetchJSON<VEOELearning>(`${BASE}/veoe/api/learning`),
  health: () => fetchJSON<{ status: string }>(`${BASE}/veoe/api/health`),
};

// ── Crypto Endpoints (The Machine) ─────────────
// Maps The Machine's /api/v1/dashboard to the existing frontend types.

async function machineDashboard(): Promise<any> {
  return fetchJSON<any>(`${BASE}/machine/api/v1/dashboard`);
}

export const crypto = {
  balance: async (): Promise<CryptoBalance> => {
    const d = await machineDashboard();
    return {
      total_usd: d.equity || 0,
      cash_usd: 0,
      cash_usdc: d.equity || 0,
      inventory_usd: 0,
      timestamp: new Date().toISOString(),
      source: "the-machine",
      cached: false,
    };
  },
  equity: async (_days = 90): Promise<CryptoEquityPoint[]> => {
    const d = await machineDashboard();
    return [{ timestamp: new Date().toISOString(), equity: d.equity || 0 }];
  },
  positions: async (): Promise<CryptoPosition[]> => {
    const d = await machineDashboard();
    return (d.positions || []).map((p: any, i: number) => ({
      id: i,
      pair: p.instrument || "",
      side: p.side || "",
      entry_price: p.entry_price || 0,
      quote_size: (p.entry_price || 0) * (p.quantity || 0),
      current_price: p.entry_price || 0,
      unrealized_pnl: p.unrealized_pnl || 0,
      strategy: p.strategy || "",
      entry_fee: 0,
      strategy_name: p.strategy || "",
    }));
  },
  trades: async (): Promise<CryptoTrade[]> => [],
  strategies: async (): Promise<CryptoStrategy[]> => {
    const d = await machineDashboard();
    const strats = d.strategies || {};
    return Object.entries(strats).map(([name, s]: [string, any], i) => ({
      id: i,
      name,
      display_name: name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
      description: "",
      status: s.paused ? "paused" : "active",
      allocation_pct: typeof s.allocation === "number" ? s.allocation * 100 : 0,
      trade_count: 0,
      total_pnl: s.daily_pnl || 0,
      win_rate: 0,
      live_status: s.paused ? `paused: ${s.pause_reason || ""}` : "running",
    }));
  },
  signals: async (): Promise<CryptoSignals> => ({
    fear_greed: { value: 0, label: "N/A", date: "", trend: "" },
    sopr: { value: 0, date: "", status: "" },
    funding: { rate: 0, direction: "", instrument: "BTC-PERP-INTX" },
    macro: { next_event: "", next_event_date: "", status: "", macro_score: 0 },
  } as any),
  risk: async (): Promise<CryptoRisk> => {
    const d = await machineDashboard();
    const r = d.risk || {};
    return {
      current_equity: r.daily_open_equity || 0,
      peak_equity: r.monthly_high_water || 0,
      drawdown_pct: r.monthly_high_water > 0
        ? ((r.monthly_high_water - r.daily_open_equity) / r.monthly_high_water) * 100
        : 0,
      drawdown_tier: r.is_killed ? "KILLED" : "normal",
      positions_open: (d.positions || []).length,
      max_position_pct: 0,
      limits: {
        strategy_limit: { threshold: 3, current: 0, tripped: false },
        daily_limit: { threshold: 5, current: 0, tripped: false },
        weekly_limit: { threshold: 10, current: 0, tripped: r.weekly_paused || false },
        monthly_limit: { threshold: 20, current: 0, tripped: r.monthly_paused || false },
      },
    } as any;
  },
  stats: async (): Promise<CryptoStats> => ({
    total_return_pct: 0, total_trades: 0, win_rate: 0,
    total_pnl: 0, total_fees: 0, avg_trade_pnl: 0,
    max_win: 0, max_loss: 0, per_strategy: [],
  } as any),
  learning: async (): Promise<CryptoLearning> => ({
    learner_active: false, confidence: "N/A",
    lesson_count: 0, bootstrap_count: 0, live_count: 0,
    recent_lessons: [], blocked_pairs: [],
  } as any),
  health: () => fetchJSON<{ status: string }>(`${BASE}/machine/health`),
};

// ── WebSocket ───────────────────────────────────
// The Machine doesn't have WebSocket yet — no-op.

export function connectCryptoWS(
  _onMessage: (data: CryptoWSUpdate) => void,
  _onError?: (err: Event) => void
): WebSocket | null {
  return null;
}
