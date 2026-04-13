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
  total_equity: number;
  cash_usd: number;
  cash_usdc: number;
  timestamp: string;
  source: "live" | "cached";
}

export interface CryptoEquityPoint {
  timestamp: string;
  equity: number;
  unrealized_pnl?: number;
  open_positions?: number;
}

export interface CryptoPosition {
  pair: string;
  side: "buy" | "sell";
  entry_price: number;
  current_price: number;
  size: number;
  unrealized_pnl: number;
  strategy: string;
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
  drawdown_pct: number;
  drawdown_tier: "safe" | "caution" | "warning" | "critical";
  open_positions: number;
  max_positions: number;
  cash_reserve_pct: number;
  circuit_breakers: {
    daily_loss: { triggered: boolean; limit: number };
    weekly_loss: { triggered: boolean; limit: number };
    monthly_loss: { triggered: boolean; limit: number };
  };
}

export interface CryptoStats {
  total_return_pct: number;
  win_rate: number;
  total_pnl: number;
  total_fees: number;
  total_trades: number;
  monthly_performance: Array<{
    month: string;
    pnl: number;
    return_pct: number;
  }>;
}

export interface CryptoLearning {
  activated: boolean;
  confidence: number;
  total_lessons: number;
  live_lessons: number;
  overall_win_rate: number;
  maker_win_rate: number;
  taker_win_rate: number;
  top_pairs: Array<{ pair: string; score: number }>;
  blocked_pairs: Array<{ pair: string; win_rate: number }>;
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
