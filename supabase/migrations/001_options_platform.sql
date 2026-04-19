-- Options Trading Platform Schema
-- Applied to Supabase project: mtm-options (hvbvfcusroomhiywgylb)
-- Date: 2026-04-18

-- Settings: global config (single row)
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode TEXT NOT NULL DEFAULT 'paper' CHECK (mode IN ('paper', 'live')),
    trailing_stop_default DECIMAL NOT NULL DEFAULT 20.0,
    profit_target_default DECIMAL NOT NULL DEFAULT 100.0,
    max_positions INT NOT NULL DEFAULT 10,
    max_cost_per_trade DECIMAL DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO settings (mode) VALUES ('paper');

-- Analysis runs
CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    macro_summary JSONB,
    flow_summary JSONB,
    fundamental_summary JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Recommendations
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    rank INT NOT NULL,
    ticker TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('bull', 'bear', 'neutral')),
    option_type TEXT NOT NULL,
    buy_strike DECIMAL NOT NULL,
    sell_strike DECIMAL,
    expiry DATE NOT NULL,
    structure_description TEXT NOT NULL,
    confidence INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    expected_return_pct DECIMAL NOT NULL,
    cost_per_contract DECIMAL NOT NULL,
    max_loss DECIMAL NOT NULL,
    max_return_pct DECIMAL,
    breakeven DECIMAL,
    timeframe TEXT NOT NULL CHECK (timeframe IN ('short', 'mid', 'long')),
    reasons JSONB NOT NULL DEFAULT '[]',
    kill_conditions JSONB NOT NULL DEFAULT '[]',
    exit_plan JSONB NOT NULL DEFAULT '{}',
    verify_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'rejected', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Positions
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID REFERENCES recommendations(id),
    ticker TEXT NOT NULL,
    structure_description TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
    quantity INT NOT NULL DEFAULT 1,
    entry_price DECIMAL NOT NULL,
    current_price DECIMAL,
    peak_price DECIMAL,
    unrealized_pnl DECIMAL DEFAULT 0,
    unrealized_pnl_pct DECIMAL DEFAULT 0,
    realized_pnl DECIMAL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'stopped_out', 'profit_taken', 'time_stopped', 'manual_exit')),
    tradier_order_ids JSONB DEFAULT '[]',
    exit_order_ids JSONB DEFAULT '[]',
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    exit_price DECIMAL,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- Exit rules
CREATE TABLE exit_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('trailing_stop', 'profit_target', 'time_stop')),
    trailing_pct DECIMAL,
    profit_target_pct DECIMAL,
    time_stop_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trade log
CREATE TABLE trade_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('open', 'close', 'adjust', 'stop_triggered', 'profit_taken', 'time_stopped', 'manual_exit', 'error')),
    details JSONB NOT NULL DEFAULT '{}',
    source TEXT NOT NULL CHECK (source IN ('manual', 'auto', 'trailing_stop', 'profit_target', 'time_stop')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_recommendations_run_id ON recommendations(run_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_positions_status ON positions(status);
CREATE INDEX idx_positions_mode ON positions(mode);
CREATE INDEX idx_exit_rules_position_id ON exit_rules(position_id);
CREATE INDEX idx_exit_rules_active ON exit_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_trade_log_position_id ON trade_log(position_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE recommendations;

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_settings" ON settings FOR SELECT USING (true);
CREATE POLICY "anon_read_runs" ON analysis_runs FOR SELECT USING (true);
CREATE POLICY "anon_read_recommendations" ON recommendations FOR SELECT USING (true);
CREATE POLICY "anon_read_positions" ON positions FOR SELECT USING (true);
CREATE POLICY "anon_read_exit_rules" ON exit_rules FOR SELECT USING (true);
CREATE POLICY "anon_read_trade_log" ON trade_log FOR SELECT USING (true);
CREATE POLICY "anon_update_settings_mode" ON settings FOR UPDATE USING (true) WITH CHECK (true);
