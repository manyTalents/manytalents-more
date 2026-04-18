/**
 * TypeScript interfaces for the MTM Options Trading Platform.
 * Tables: settings, analysis_runs, recommendations, positions, exit_rules, trade_log
 * API request/response shapes for the options-service FastAPI backend.
 */

// ── Database Row Types ───────────────────────────────────────────────────────

export interface Settings {
  id: number
  mode: 'paper' | 'live'
  trailing_stop_default: number
  profit_target_default: number
  max_positions: number
  max_cost_per_trade: number
}

export interface AnalysisRun {
  id: string                         // uuid
  status: 'running' | 'done' | 'error'
  started_at: string                 // timestamp
  completed_at: string | null
  macro_summary: string | null
  flow_summary: string | null
  fundamental_summary: string | null
  error_message: string | null
}

export interface Recommendation {
  id: string                         // uuid
  run_id: string                     // uuid → analysis_runs.id
  rank: number
  ticker: string
  direction: 'bull' | 'bear' | 'neutral'
  option_type: 'spread' | 'single' | 'iron_condor' | 'butterfly'
  buy_strike: number | null
  sell_strike: number | null
  expiry: string                     // date string YYYY-MM-DD
  structure_description: string
  confidence: number                 // 0–100
  expected_return_pct: number
  cost_per_contract: number
  max_loss: number
  max_return_pct: number
  breakeven: number | null
  timeframe: string
  reasons: string[]
  kill_conditions: string[]
  exit_plan: string
  verify_url: string | null
  status: 'pending' | 'executed' | 'skipped' | 'expired'
}

export interface Position {
  id: string                         // uuid
  recommendation_id: string | null   // uuid → recommendations.id
  ticker: string
  structure_description: string
  mode: 'paper' | 'live'
  quantity: number
  entry_price: number
  current_price: number | null
  peak_price: number | null
  unrealized_pnl: number | null
  unrealized_pnl_pct: number | null
  realized_pnl: number | null
  status: 'open' | 'closed' | 'pending_exit'
  tradier_order_ids: string[]
  exit_order_ids: string[]
  opened_at: string                  // timestamp
  closed_at: string | null
  exit_price: number | null
  last_updated: string               // timestamp
}

export interface ExitRule {
  id: string                         // uuid
  position_id: string                // uuid → positions.id
  rule_type: 'trailing_stop' | 'profit_target' | 'time_stop'
  trailing_pct: number | null
  profit_target_pct: number | null
  time_stop_date: string | null      // date string YYYY-MM-DD
  is_active: boolean
  triggered_at: string | null        // timestamp
}

export interface TradeLogEntry {
  id: string                         // uuid
  position_id: string | null         // uuid → positions.id
  action: string
  details: Record<string, unknown>
  source: 'system' | 'user' | 'monitor'
  created_at: string                 // timestamp
}

// ── API Request / Response Types ─────────────────────────────────────────────

export interface ExecuteRequest {
  recommendation_id: string
  quantity: number
}

export interface AnalyzeResponse {
  run_id: string
  status: 'running' | 'done' | 'error'
}

export interface ExecuteResponse {
  position_id: string
  status: 'ok' | 'error'
  message: string
  entry_price?: number
  warning?: string
}

export interface CloseResponse {
  position_id: string
  status: 'ok' | 'error'
  exit_price?: number
  realized_pnl?: number
}
