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

async function machineTrades(): Promise<any[]> {
  try {
    return await fetchJSON<any[]>(`${BASE}/machine/api/v1/trades`);
  } catch {
    return [];
  }
}

export const crypto = {
  balance: async (): Promise<CryptoBalance> => {
    const d = await machineDashboard();
    const gridPnl = d.strategies?.grid?.daily_pnl || 0;
    const equity = (d.equity || 0) + gridPnl;
    return {
      total_usd: equity,
      cash_usd: d.equity || 0,
      cash_usdc: 0,
      inventory_usd: gridPnl,
      timestamp: new Date().toISOString(),
      source: "the-machine",
      cached: false,
    };
  },
  equity: async (days = 90): Promise<CryptoEquityPoint[]> => {
    try {
      const res = await fetchJSON<{ points: CryptoEquityPoint[] }>(
        `${BASE}/machine/api/v1/equity?days=${days}`
      );
      return res.points || [];
    } catch {
      const d = await machineDashboard();
      const gridPnl = d.strategies?.grid?.daily_pnl || 0;
      return [{ timestamp: new Date().toISOString(), equity: (d.equity || 0) + gridPnl }];
    }
  },
  positions: async (): Promise<CryptoPosition[]> => {
    const d = await machineDashboard();
    const grid = d.strategies?.grid;
    if (!grid?.instances) return [];
    return grid.instances.map((inst: any, i: number) => ({
      id: i,
      pair: inst.instrument || "",
      side: "GRID",
      entry_price: 0,
      quote_size: inst.daily_pnl || 0,
      current_price: 0,
      unrealized_pnl: inst.daily_pnl || 0,
      strategy: "grid",
      entry_fee: 0,
      strategy_name: `Grid (${inst.active_levels} levels)`,
    }));
  },
  trades: async (): Promise<CryptoTrade[]> => {
    const fills = await machineTrades();
    return fills.map((f: any, i: number) => ({
      id: f.id || i,
      pair: f.instrument || "",
      side: f.entry_side || "buy",
      strategy: "grid",
      strategy_name: "Adaptive Grid",
      entry_price: f.entry_price || 0,
      exit_price: f.counter_price || 0,
      quote_size: f.entry_price || 0,
      base_size: 1,
      pnl: f.cycle_pnl || 0,
      pnl_pct: f.entry_price > 0 ? ((f.cycle_pnl || 0) / f.entry_price) * 100 : 0,
      entry_time: f.entry_time || "",
      exit_time: f.entry_time || "",
      entry_fee: 0,
      exit_fee: 0,
      maker_taker: "maker",
      exit_reason: "grid_cycle",
    }));
  },
  strategies: async (): Promise<CryptoStrategy[]> => {
    const d = await machineDashboard();
    const strats = d.strategies || {};
    const fills = await machineTrades();
    const gridFillCount = fills.length;
    const gridWins = fills.filter((f: any) => (f.cycle_pnl || 0) > 0).length;
    return Object.entries(strats).map(([name, s]: [string, any], i) => {
      const isGrid = name === "grid";
      return {
        id: i,
        name,
        display_name: name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
        description: "",
        status: s.paused ? "paused" : "active",
        capital_allocation_pct: typeof s.allocation === "number" ? Math.round(s.allocation * 100) : 0,
        total_trades: isGrid ? gridFillCount : 0,
        wins: isGrid ? gridWins : 0,
        total_pnl: s.daily_pnl || 0,
        win_rate: isGrid && gridFillCount > 0 ? Math.round((gridWins / gridFillCount) * 100) : 0,
        live_status: s.paused ? `paused: ${s.pause_reason || ""}` : "running",
      };
    });
  },
  signals: async (): Promise<CryptoSignals> => ({
    fear_greed: { value: 0, label: "N/A", date: "", trend: "", action: "wait" },
    sopr: { value: 0, ema_7d: 0, date: "", status: "N/A", sparkline: [], action: "wait" },
    vix: { value: 0, date: "", status: "N/A", sparkline: [], action: "wait" },
    dxy: { value: 0, date: "", change_20d_pct: 0, status: "N/A", sparkline: [], action: "wait" },
    macro_filter: { trading_allowed: true, status: "ok", macro_score: 0 },
  }),
  risk: async (): Promise<CryptoRisk> => {
    const d = await machineDashboard();
    const r = d.risk || {};
    const gridPnl = d.strategies?.grid?.daily_pnl || 0;
    const equity = (d.equity || 0) + gridPnl;
    const peak = Math.max(r.monthly_high_water || 0, equity);
    return {
      current_equity: equity,
      peak_equity: peak,
      drawdown_pct: peak > 0 ? ((peak - equity) / peak) * 100 : 0,
      drawdown_tier: r.is_killed ? "KILLED" : "normal",
      positions_open: d.strategies?.grid?.instances?.length || 0,
      positions_max: 10,
      cash_reserve_pct: 20,
      cash_reserve_ok: true,
      today_pnl: gridPnl,
      today_pnl_pct: d.equity > 0 ? (gridPnl / d.equity) * 100 : 0,
      circuit_breakers: {
        daily_limit: { threshold: 5, current: d.equity > 0 ? (gridPnl / d.equity) * 100 : 0, tripped: false },
        weekly_limit: { threshold: 10, current: 0, tripped: r.weekly_paused || false },
        monthly_limit: { threshold: 20, current: 0, tripped: r.monthly_paused || false },
      },
    };
  },
  stats: async (): Promise<CryptoStats> => {
    try {
      return await fetchJSON<CryptoStats>(`${BASE}/machine/api/v1/stats`);
    } catch {
      const d = await machineDashboard();
      const fills = await machineTrades();
      const gridPnl = d.strategies?.grid?.daily_pnl || 0;
      const totalTrades = fills.length;
      const wins = fills.filter((f: any) => (f.cycle_pnl || 0) > 0).length;
      const totalPnl = fills.reduce((sum: number, f: any) => sum + (f.cycle_pnl || 0), 0);
      const startingEquity = 436.55;
      const currentEquity = (d.equity || 0) + gridPnl;
      return {
        total_return_pct: startingEquity > 0 ? ((currentEquity - startingEquity) / startingEquity) * 100 : 0,
        total_trades: totalTrades,
        win_rate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
        total_pnl: totalPnl,
        total_fees: 0,
        avg_win: wins > 0 ? fills.filter((f: any) => (f.cycle_pnl || 0) > 0).reduce((s: number, f: any) => s + f.cycle_pnl, 0) / wins : 0,
        avg_loss: 0,
        starting_equity: startingEquity,
        current_equity: currentEquity,
        monthly_returns: [],
      };
    }
  },
  learning: async (): Promise<CryptoLearning> => ({
    learner_active: false, confidence: "N/A",
    lesson_count: 0, bootstrap_count: 0, live_count: 0,
    overall_wr: 0, maker_wr: 0, taker_wr: 0,
    top_pairs: [], bottom_pairs: [], blocked_pairs: [],
  }),
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
