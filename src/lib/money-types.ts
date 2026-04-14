/**
 * TypeScript interfaces for Money dashboard API responses.
 * VEOE endpoints: /veoe/api/*
 * Crypto endpoints: /crypto/api/*
 *
 * Field names match the ACTUAL API responses (verified 2026-04-13).
 */

// ── VEOE Types ──────────────────────────────────

export interface VEOESummary {
  account_value: number;
  starting_balance: number;
  total_pnl: number;
  total_pnl_pct: number;
  high_water_mark: number;
  drawdown: number;
  drawdown_pct: number;
  open_positions: number;
  total_trades: number;
  mtd: {
    net_profit: number;
    trade_count: number;
    win_rate: number;
    profit_factor: number;
    avg_win: number;
    avg_loss: number;
  };
  ytd: {
    net_profit: number;
    trade_count: number;
    win_rate: number;
  };
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
  entry_date: string;
  entry_price: number;
  quantity: number;
  call_strike: number;
  put_strike: number;
  expiration: string;
  dte: number;
  cost: number;
  exit_date: string | null;
  exit_price: number | null;
  pnl: number | null;
  pnl_pct: number | null;
  exit_reason: string | null;
  quote_source: string;
  mode: string;
  status: "open" | "closed" | "expired";
}

export interface VEOESignal {
  ticker: string;
  score: number;
  date: string;
  close: number;
  breakout_status: string;
  ema200_trend: string;
  vol_spike: number;
  rv7: number;
  rv30: number;
  rv90: number;
  cr_7_30: number;
  bbw_pct: number;
  atr_pct: number;
  breakdown: Record<string, unknown>;
}

export interface VEOEAlpha {
  available: boolean;
  period: string;
  days: number;
  veoe_return_pct: number;
  spy_return_pct: number;
  alpha_pct: number;
  sharpe: number;
  weekly_return_pct: number;
}

export interface VEOEConfig {
  available: boolean;
  strategy: string;
  execution_mode: string;
  sizing_mode: string;
  max_positions: number;
  starting_balance: number;
  entry_mode: string;
  min_score: number;
  exits: Record<string, string>;
  adaptive_scoring: string;
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
  side: string;
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
  side: string;
  strategy: string;
  strategy_name: string;
  entry_price: number;
  exit_price: number;
  quote_size: number;
  base_size: number;
  pnl: number;
  pnl_pct: number;
  entry_time: string;
  exit_time: string;
  entry_fee: number;
  exit_fee: number;
  maker_taker: string;
  exit_reason: string;
}

export interface CryptoStrategy {
  id: number;
  name: string;
  display_name: string;
  description: string;
  status: string;
  capital_allocation_pct: number;
  total_trades: number;
  wins: number;
  total_pnl: number;
  win_rate: number;
  live_status: string;
}

export interface CryptoSignals {
  fear_greed: {
    value: number;
    label: string;
    date: string;
    trend: string;
    action: string;
  };
  sopr: {
    value: number;
    ema_7d: number;
    date: string;
    status: string;
    sparkline: number[];
    action: string;
  };
  vix: {
    value: number;
    date: string;
    status: string;
    sparkline: number[];
    action: string;
  };
  dxy: {
    value: number;
    date: string;
    change_20d_pct: number;
    status: string;
    sparkline: number[];
    action: string;
  };
  macro_filter: {
    trading_allowed: boolean;
    status: string;
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
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  total_fees: number;
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
    total_equity: number;
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
