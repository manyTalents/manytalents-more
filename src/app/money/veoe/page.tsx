"use client";

import { useEffect, useState } from "react";
import AuthGate from "../components/AuthGate";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import EquityChart from "../components/EquityChart";
import TradeTable from "../components/TradeTable";
import SignalCard from "../components/SignalCard";
import { veoe } from "@/lib/money-api";
import type {
  VEOESummary,
  VEOEEquityPoint,
  VEOETrade,
  VEOESignal,
  VEOEAlpha,
  VEOEConfig,
} from "@/lib/money-types";

export default function VEOEPage() {
  const [summary, setSummary] = useState<VEOESummary | null>(null);
  const [equity, setEquity] = useState<VEOEEquityPoint[]>([]);
  const [trades, setTrades] = useState<VEOETrade[]>([]);
  const [signals, setSignals] = useState<VEOESignal[]>([]);
  const [alpha, setAlpha] = useState<VEOEAlpha | null>(null);
  const [config, setConfig] = useState<VEOEConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, e, t, sig, a, c] = await Promise.all([
          veoe.summary(),
          veoe.equity(),
          veoe.trades(),
          veoe.signals(),
          veoe.alpha(),
          veoe.config(),
        ]);
        setSummary(s);
        setEquity(e);
        setTrades(t);
        setSignals(sig);
        setAlpha(a);
        setConfig(c);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load VEOE data");
      }
      setLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartData = equity.map((p) => ({ time: p.date, value: p.value }));

  const openTrades = trades.filter((t) => t.status === "open");
  const closedTrades = trades.filter((t) => t.status !== "open");

  const tradeTableData = closedTrades.slice(0, 20).map((t) => ({
    id: t.id,
    ticker: t.ticker,
    strategy: t.strategy,
    pnl: t.pnl || 0,
    date: t.exit_date || t.entry_date,
  }));

  return (
    <AuthGate>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold mb-2">
            Options Trading
          </p>
          <h2 className="text-3xl font-serif font-extrabold">VEOE</h2>
        </div>
        {config && <StatusBadge mode={config.execution_mode} />}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard
          label="Account Value"
          value={summary ? fmt(summary.account_value) : "..."}
          loading={loading}
        />
        <MetricCard
          label="Total P&L"
          value={summary ? fmt(summary.total_pnl) : "..."}
          subValue={summary ? `${summary.total_pnl_pct >= 0 ? "+" : ""}${summary.total_pnl_pct.toFixed(1)}%` : undefined}
          trend={summary ? (summary.total_pnl >= 0 ? "up" : "down") : undefined}
          loading={loading}
        />
        <MetricCard
          label="MTD P&L"
          value={summary ? fmt(summary.mtd.net_profit) : "..."}
          trend={summary ? (summary.mtd.net_profit >= 0 ? "up" : "down") : undefined}
          loading={loading}
        />
        <MetricCard
          label="Win Rate"
          value={summary ? `${summary.mtd.win_rate.toFixed(1)}%` : "..."}
          loading={loading}
        />
        <MetricCard
          label="Drawdown"
          value={summary ? `${summary.drawdown_pct.toFixed(1)}%` : "..."}
          trend="down"
          loading={loading}
        />
        <MetricCard
          label="Open Positions"
          value={summary ? String(summary.open_positions) : "..."}
          loading={loading}
        />
      </div>

      {/* Equity Curve */}
      <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-serif font-bold mb-4">Equity Curve</h3>
        <EquityChart data={chartData} loading={loading} height={350} />
      </div>

      {/* Alpha + Config */}
      {(alpha || config) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {alpha && (
            <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
              <h3 className="text-lg font-serif font-bold mb-4">
                Alpha vs SPY
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <SignalCard
                  label="VEOE Return"
                  value={`${alpha.veoe_return_pct >= 0 ? "+" : ""}${alpha.veoe_return_pct.toFixed(2)}%`}
                  color={alpha.veoe_return_pct >= 0 ? "emerald" : "red"}
                />
                <SignalCard
                  label="SPY Return"
                  value={`${alpha.spy_return_pct >= 0 ? "+" : ""}${alpha.spy_return_pct.toFixed(2)}%`}
                  color="blue"
                />
                <SignalCard
                  label="Alpha"
                  value={`${alpha.alpha_pct >= 0 ? "+" : ""}${alpha.alpha_pct.toFixed(2)}%`}
                  color={alpha.alpha_pct >= 0 ? "gold" : "red"}
                />
                <SignalCard
                  label="Sharpe Ratio"
                  value={alpha.sharpe.toFixed(2)}
                  color="gold"
                />
              </div>
            </div>
          )}

          {config && (
            <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
              <h3 className="text-lg font-serif font-bold mb-4">
                Configuration
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Execution Mode</span>
                  <StatusBadge mode={config.execution_mode} />
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Strategy</span>
                  <span className="font-mono">{config.strategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Max Positions</span>
                  <span className="font-mono">{config.max_positions}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Open Trades */}
      {openTrades.length > 0 && (
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-serif font-bold mb-4">
            Open Positions ({openTrades.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Ticker</th>
                  <th className="text-left py-3 px-2">Strategy</th>
                  <th className="text-right py-3 px-2">Entry</th>
                  <th className="text-right py-3 px-2">DTE</th>
                  <th className="text-right py-3 px-2">Cost</th>
                  <th className="text-right py-3 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-navy-border/50 hover:bg-navy-card/50 transition"
                  >
                    <td className="py-3 px-2 font-medium">{t.ticker}</td>
                    <td className="py-3 px-2 text-neutral-400 text-xs">
                      {t.strategy}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      ${t.entry_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      {t.dte}d
                    </td>
                    <td className="py-3 px-2 text-right font-mono">
                      ${t.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                        {t.mode}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signals */}
      {signals.length > 0 && (
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-serif font-bold mb-4">
            Recent Signals
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Ticker</th>
                  <th className="text-right py-3 px-2">Score</th>
                  <th className="text-left py-3 px-2">Breakout</th>
                  <th className="text-right py-3 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 10).map((s, i) => (
                  <tr
                    key={i}
                    className="border-b border-navy-border/50 hover:bg-navy-card/50 transition"
                  >
                    <td className="py-3 px-2 font-medium">{s.ticker}</td>
                    <td className="py-3 px-2 text-right font-mono">
                      {s.score.toFixed(1)}
                    </td>
                    <td className="py-3 px-2 text-xs text-neutral-400">
                      {s.breakout_status}
                    </td>
                    <td className="py-3 px-2 text-right text-neutral-500">
                      {s.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed Trades */}
      <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
        <h3 className="text-lg font-serif font-bold mb-4">
          Recent Closed Trades
        </h3>
        <TradeTable trades={tradeTableData} loading={loading} />
      </div>
    </AuthGate>
  );
}
