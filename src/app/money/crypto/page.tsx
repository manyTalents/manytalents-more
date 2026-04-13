"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AuthGate from "../components/AuthGate";
import MetricCard from "../components/MetricCard";
import EquityChart from "../components/EquityChart";
import TradeTable from "../components/TradeTable";
import SignalCard from "../components/SignalCard";
import DrawdownGauge from "../components/DrawdownGauge";
import StrategyCard from "../components/StrategyCard";
import { crypto, connectCryptoWS } from "@/lib/money-api";
import type {
  CryptoBalance,
  CryptoEquityPoint,
  CryptoPosition,
  CryptoStrategy,
  CryptoSignals,
  CryptoRisk,
  CryptoStats,
  CryptoTrade,
  CryptoLearning,
  CryptoWSUpdate,
} from "@/lib/money-types";

type ViewMode = "operator" | "investor";

export default function CryptoPage() {
  const [balance, setBalance] = useState<CryptoBalance | null>(null);
  const [equity, setEquity] = useState<CryptoEquityPoint[]>([]);
  const [positions, setPositions] = useState<CryptoPosition[]>([]);
  const [strategies, setStrategies] = useState<CryptoStrategy[]>([]);
  const [signals, setSignals] = useState<CryptoSignals | null>(null);
  const [risk, setRisk] = useState<CryptoRisk | null>(null);
  const [stats, setStats] = useState<CryptoStats | null>(null);
  const [trades, setTrades] = useState<CryptoTrade[]>([]);
  const [learning, setLearning] = useState<CryptoLearning | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("operator");
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch all REST data
  const fetchAll = useCallback(async () => {
    try {
      const [b, e, p, str, sig, r, st, t, l] = await Promise.all([
        crypto.balance(),
        crypto.equity(90),
        crypto.positions(),
        crypto.strategies(),
        crypto.signals(),
        crypto.risk(),
        crypto.stats(),
        crypto.trades(50),
        crypto.learning(),
      ]);
      setBalance(b);
      setEquity(e);
      setPositions(p);
      setStrategies(str);
      setSignals(sig);
      setRisk(r);
      setStats(st);
      setTrades(t);
      setLearning(l);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load crypto data");
    }
    setLoading(false);
  }, []);

  // WebSocket for live balance updates
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);

    try {
      const ws = connectCryptoWS(
        (data: CryptoWSUpdate) => {
          setBalance((prev) =>
            prev
              ? {
                  ...prev,
                  total_equity: data.balance.total_equity,
                  cash_usd: data.balance.cash,
                  source: "live",
                  timestamp: data.timestamp,
                }
              : prev
          );
          setWsConnected(true);
        },
        () => setWsConnected(false)
      );
      wsRef.current = ws;
    } catch {
      // WebSocket connection failed — REST polling handles it
    }

    return () => {
      clearInterval(interval);
      wsRef.current?.close();
    };
  }, [fetchAll]);

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartData = equity.map((p) => ({
    time: p.timestamp.split("T")[0],
    value: p.equity,
  }));

  const tradeTableData = trades.slice(0, 20).map((t) => ({
    id: t.id,
    pair: t.pair,
    side: t.side.toUpperCase(),
    strategy: t.strategy,
    pnl: t.pnl,
    date: t.exit_time.split("T")[0],
  }));

  return (
    <AuthGate>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold mb-2">
            Crypto Trading
          </p>
          <h2 className="text-3xl font-serif font-extrabold">Crypto Bot</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-navy-card rounded-lg p-0.5">
            {(["operator", "investor"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition ${
                  viewMode === mode
                    ? "bg-gold/10 text-gold"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {/* WS indicator */}
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"
            }`}
            title={wsConnected ? "WebSocket live" : "WebSocket disconnected"}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard
          label="Total Equity"
          value={balance ? fmt(balance.total_equity) : "..."}
          subValue={balance?.source === "live" ? "Live from Kraken" : "Cached"}
          loading={loading}
        />
        <MetricCard
          label="Cash Balance"
          value={balance ? fmt(balance.cash_usd + (balance.cash_usdc || 0)) : "..."}
          loading={loading}
        />
        {stats && (
          <>
            <MetricCard
              label="Total P&L"
              value={fmt(stats.total_pnl)}
              subValue={`${stats.total_return_pct >= 0 ? "+" : ""}${stats.total_return_pct.toFixed(1)}%`}
              trend={stats.total_pnl >= 0 ? "up" : "down"}
              loading={loading}
            />
            <MetricCard
              label="Win Rate"
              value={`${stats.win_rate.toFixed(1)}%`}
              loading={loading}
            />
            <MetricCard
              label="Total Trades"
              value={String(stats.total_trades)}
              loading={loading}
            />
          </>
        )}
      </div>

      {/* Equity Curve */}
      <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-serif font-bold mb-4">Equity Curve</h3>
        <EquityChart data={chartData} loading={loading} height={350} color="#5db56e" />
      </div>

      {/* Operator-only sections */}
      {viewMode === "operator" && (
        <>
          {/* Risk + Positions row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Risk */}
            {risk && (
              <div>
                <DrawdownGauge
                  drawdownPct={risk.drawdown_pct}
                  tier={risk.drawdown_tier}
                />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
                    <p className="text-xs text-neutral-500 mb-1">Positions</p>
                    <p className="font-mono text-lg">
                      {risk.open_positions} / {risk.max_positions}
                    </p>
                  </div>
                  <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
                    <p className="text-xs text-neutral-500 mb-1">Cash Reserve</p>
                    <p className="font-mono text-lg">
                      {risk.cash_reserve_pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Open Positions */}
            <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
              <h3 className="text-lg font-serif font-bold mb-4">
                Open Positions ({positions.length})
              </h3>
              {positions.length === 0 ? (
                <p className="text-neutral-500 text-sm">No open positions.</p>
              ) : (
                <div className="space-y-3">
                  {positions.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-navy-border/50 last:border-0"
                    >
                      <div>
                        <p className="font-medium text-sm">{p.pair}</p>
                        <p className="text-xs text-neutral-500">
                          {p.strategy} &middot; {p.side.toUpperCase()}
                        </p>
                      </div>
                      <p
                        className={`font-mono text-sm ${
                          p.unrealized_pnl >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {p.unrealized_pnl >= 0 ? "+" : ""}
                        {fmt(p.unrealized_pnl)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Strategies */}
          {strategies.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-serif font-bold mb-4">Strategies</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {strategies.map((s) => (
                  <StrategyCard
                    key={s.name}
                    name={s.display_name}
                    status={s.status}
                    allocation={s.capital_allocation_pct}
                    trades={s.trade_count}
                    winRate={s.win_rate}
                    pnl={s.total_pnl}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Signals */}
          {signals && (
            <div className="mb-8">
              <h3 className="text-lg font-serif font-bold mb-4">
                Market Signals
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SignalCard
                  label="Fear & Greed"
                  value={signals.fear_greed.value}
                  status={signals.fear_greed.label}
                  detail={signals.fear_greed.action}
                  color={signals.fear_greed.value < 30 ? "red" : signals.fear_greed.value > 70 ? "emerald" : "amber"}
                />
                <SignalCard
                  label="SOPR"
                  value={signals.sopr.value.toFixed(3)}
                  status={signals.sopr.status}
                  detail={`7D EMA: ${signals.sopr.ema_7d.toFixed(3)}`}
                  color={signals.sopr.value < 0.95 ? "red" : "emerald"}
                />
                <SignalCard
                  label="VIX"
                  value={signals.vix.value.toFixed(1)}
                  status={signals.vix.status}
                  detail={`20D: ${signals.vix.change_20d >= 0 ? "+" : ""}${signals.vix.change_20d.toFixed(1)}%`}
                  color={signals.vix.value > 25 ? "red" : signals.vix.value > 20 ? "amber" : "emerald"}
                />
                <SignalCard
                  label="DXY"
                  value={signals.dxy.value.toFixed(2)}
                  status={signals.dxy.trend}
                  detail={`20D: ${signals.dxy.change_20d >= 0 ? "+" : ""}${signals.dxy.change_20d.toFixed(1)}%`}
                  color="blue"
                />
              </div>
              {/* Macro filter */}
              <div
                className={`mt-4 rounded-xl border p-4 ${
                  signals.macro_filter.trading_allowed
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {signals.macro_filter.trading_allowed
                        ? "Trading Allowed"
                        : "Trading Blocked"}
                    </p>
                    <p className="text-xs text-neutral-500">Macro filter</p>
                  </div>
                  <p className="text-lg font-mono">
                    {(signals.macro_filter.macro_score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pair Learner */}
          {learning && learning.activated && (
            <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-serif font-bold mb-4">
                Pair Learner
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-neutral-500">Lessons</p>
                  <p className="font-mono">{learning.total_lessons} ({learning.live_lessons} live)</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Win Rate</p>
                  <p className="font-mono">{learning.overall_win_rate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Maker WR</p>
                  <p className="font-mono">{learning.maker_win_rate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Confidence</p>
                  <p className="font-mono">{(learning.confidence * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {learning.top_pairs.length > 0 && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">Top Pairs</p>
                    {learning.top_pairs.slice(0, 5).map((p) => (
                      <div
                        key={p.pair}
                        className="flex justify-between text-sm py-1"
                      >
                        <span className="font-mono">{p.pair}</span>
                        <span className="text-emerald-400 font-mono">
                          {p.score.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {learning.blocked_pairs.length > 0 && (
                  <div>
                    <p className="text-xs text-neutral-500 mb-2">
                      Blocked Pairs
                    </p>
                    {learning.blocked_pairs.slice(0, 5).map((p) => (
                      <div
                        key={p.pair}
                        className="flex justify-between text-sm py-1"
                      >
                        <span className="font-mono">{p.pair}</span>
                        <span className="text-red-400 font-mono">
                          {p.win_rate.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Investor view: monthly performance */}
      {viewMode === "investor" && stats && (
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-serif font-bold mb-4">
            Monthly Performance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="Total Return"
              value={`${stats.total_return_pct >= 0 ? "+" : ""}${stats.total_return_pct.toFixed(1)}%`}
              trend={stats.total_return_pct >= 0 ? "up" : "down"}
            />
            <MetricCard
              label="Win Rate"
              value={`${stats.win_rate.toFixed(1)}%`}
            />
            <MetricCard
              label="Total P&L"
              value={fmt(stats.total_pnl)}
              trend={stats.total_pnl >= 0 ? "up" : "down"}
            />
            <MetricCard
              label="Total Fees"
              value={fmt(stats.total_fees)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border text-neutral-500 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-2">Month</th>
                  <th className="text-right py-3 px-2">P&L</th>
                  <th className="text-right py-3 px-2">Return</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthly_performance.map((m) => (
                  <tr
                    key={m.month}
                    className="border-b border-navy-border/50 hover:bg-navy-card/50 transition"
                  >
                    <td className="py-3 px-2">{m.month}</td>
                    <td
                      className={`py-3 px-2 text-right font-mono ${
                        m.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {m.pnl >= 0 ? "+" : ""}${m.pnl.toFixed(2)}
                    </td>
                    <td
                      className={`py-3 px-2 text-right font-mono ${
                        m.return_pct >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {m.return_pct >= 0 ? "+" : ""}
                      {m.return_pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade History */}
      <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
        <h3 className="text-lg font-serif font-bold mb-4">
          Recent Trades
        </h3>
        <TradeTable trades={tradeTableData} loading={loading} />
      </div>
    </AuthGate>
  );
}
