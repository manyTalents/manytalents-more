-- Monetization tables for options platform

CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_session_id TEXT NOT NULL UNIQUE,
    email TEXT,
    run_id UUID REFERENCES analysis_runs(id) ON DELETE SET NULL,
    tier INT NOT NULL CHECK (tier IN (3, 5, 10)),
    amount_cents INT NOT NULL,
    acknowledged_disclaimer BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
    runs_today INT NOT NULL DEFAULT 0,
    last_run_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_purchases_run_id ON purchases(run_id);
CREATE INDEX idx_purchases_stripe_session ON purchases(stripe_session_id);
CREATE INDEX idx_subscribers_email ON subscribers(email);
CREATE INDEX idx_subscribers_stripe_customer ON subscribers(stripe_customer_id);

-- RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on purchases"
    ON purchases FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on subscribers"
    ON subscribers FOR ALL
    USING (auth.role() = 'service_role');
