/**
 * TypeScript interfaces for Money dashboard API responses.
 * VEOE endpoints: /veoe/api/*
 * Crypto endpoints: /crypto/api/*
 */

// ── VEOE Types ──────────────────────────────────

export interface VEOESummary {
  account_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  mtd_pnl: number;
  win_rate: number;
  open_positions: number;
  max_drawdown: number;
  profit_factor: number;
  mode: "paper" | "live";
}

export interface VEOEEquityPoint {
  date: string;
  value: number;
  hwm?: number;
  drawdown_pct?: number;
}

export interface VEOETrade {
  id: number;
  ticker: string;
  strategy: string;
  direction: "call" | "put";
  entry_date: string;
  entry_price: number;
  exit_date?: string;
  exit_price?: number;
  contracts: number;
  premium: number;
  cost: number;
  pnl: number;
  pnl_pct: number;
  status: "open" | "closed" | "expired";
  dte: number;
  expiry: string;
}

export interface VEOESignal {
  ticker: string;
  score: number;
  date: string;
  strategy: string;
  passed: boolean;
}

export interface VEOEAlpha {
  veoe_return_pct: number;
  spy_return_pct: number;
  alpha: number;
  sharpe_ratio: number;
  start_date: string;
}

export interface VEOEConfig {
  execution_mode: string;
  max_positions: number;
  target_risk_pct: number;
  [key: string]: unknown;
}

export interface VEOELearning {
  [key: string]: unknown;
}

// ── Crypto Types ────────────────────────────────

export interface CryptoBalance {
  total_usd: number;
  cash_usd: number;
  cash_usdc: number;
  inventory_usd: number;
  timestamp: string;
  source: string;
  cached: boolean;
}

export interface CryptoEquityPoint {
  timestamp: string;
  equity: number;
  unrealized_pnl?: number;
  open_positions?: number;
}

export interface CryptoPosition {
  id: number;
  pair: string;
  side: "BUY" | "SELL" | string;
  entry_price: number;
  quote_size: number;
  base_size: number;
  entry_time: string;
  strategy: string;
  entry_fee: number;
  strategy_name: string;
}

export interface CryptoTrade {
  id: number;
  pair: string;
  side: "buy" | "sell";
  strategy: string;
  entry_price: number;
  exit_price: number;
  size: number;
  pnl: number;
  fee: number;
  entry_time: string;
  exit_time: string;
}

export interface CryptoStrategy {
  name: string;
  display_name: string;
  status: "active" | "watching" | "inactive";
  capital_allocation_pct: number;
  trade_count: number;
  win_rate: number;
  total_pnl: number;
}

export interface CryptoSignals {
  fear_greed: {
    value: number;
    label: string;
    trend: string;
    action: string;
  };
  sopr: {
    value: number;
    ema_7d: number;
    status: string;
    history: number[];
  };
  vix: {
    value: number;
    status: string;
    change_20d: number;
    history: number[];
  };
  dxy: {
    value: number;
    trend: string;
    change_20d: number;
    history: number[];
  };
  macro_filter: {
    trading_allowed: boolean;
    macro_score: number;
  };
}

export interface CryptoRisk {
  current_equity: number;
  peak_equity: number;
  drawdown_pct: number;
  drawdown_tier: string;
  positions_open: number;
  positions_max: number;
  cash_reserve_pct: number;
  cash_reserve_ok: boolean;
  today_pnl: number;
  today_pnl_pct: number;
  circuit_breakers: {
    daily_limit: { threshold: number; current: number; tripped: boolean };
    weekly_limit: { threshold: number; current: number; tripped: boolean };
    monthly_limit: { threshold: number; current: number; tripped: boolean };
  };
}

export interface CryptoStats {
  total_return_pct: number;
  win_rate: number;
  total_pnl: number;
  total_fees: number;
  total_trades: number;
  avg_win: number;
  avg_loss: number;
  starting_equity: number;
  current_equity: number;
  monthly_returns: Array<{
    month: string;
    pnl: number;
    return_pct: number;
  }>;
}

export interface CryptoLearning {
  learner_active: boolean;
  confidence: string;
  lesson_count: number;
  bootstrap_count: number;
  live_count: number;
  overall_wr: number;
  maker_wr: number;
  taker_wr: number;
  top_pairs: Array<{ pair: string; score: number }>;
  bottom_pairs: Array<{ pair: string; score: number }>;
  blocked_pairs: Array<{ pair: string; trades: number; wins: number; wr: number }>;
}

// ── WebSocket Types ─────────────────────────────

export interface CryptoWSUpdate {
  balance: {
    total_equity: number;  // WS uses total_equity, REST uses total_usd
    cash: number;
  };
  signals_summary: {
    fear_greed: number;
    sopr: number;
    macro_allowed: boolean;
  };
  position_count: number;
  timestamp: string;
}
