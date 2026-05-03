"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGate from "../components/AuthGate";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import EquityChart from "../components/EquityChart";
import { veoe, crypto } from "@/lib/money-api";
import type { VEOESummary, CryptoBalance, CryptoStats, VEOEEquityPoint, CryptoEquityPoint } from "@/lib/money-types";

interface BotStatus {
  name: string;
  href: string;
  label: string;
  mode: string;
  value: number;
  pnl: number;
  pnlPct: number;
  positions: number;
  loading: boolean;
  error: string | null;
}

export default function HubPage() {
  const [veoeData, setVeoeData] = useState<VEOESummary | null>(null);
  const [cryptoBalance, setCryptoBalance] = useState<CryptoBalance | null>(null);
  const [cryptoStats, setCryptoStats] = useState<CryptoStats | null>(null);
  const [veoeEquity, setVeoeEquity] = useState<VEOEEquityPoint[]>([]);
  const [cryptoEquity, setCryptoEquity] = useState<CryptoEquityPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const errs: string[] = [];

      const results = await Promise.allSettled([
        veoe.summary(),
        crypto.balance(),
        crypto.stats(),
        veoe.equity(),
        crypto.equity(90),
      ]);

      if (results[0].status === "fulfilled") setVeoeData(results[0].value);
      else errs.push("VEOE API unreachable");

      if (results[1].status === "fulfilled") setCryptoBalance(results[1].value);
      else errs.push("Crypto API unreachable");

      if (results[2].status === "fulfilled") setCryptoStats(results[2].value);
      if (results[3].status === "fulfilled") setVeoeEquity(results[3].value);
      if (results[4].status === "fulfilled") setCryptoEquity(results[4].value);

      setErrors(errs);
      setLoading(false);
    };

    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalValue = (veoeData?.account_value || 0) + (cryptoBalance?.total_usd || 0);
  const totalPnl = (veoeData?.total_pnl || 0) + (cryptoStats?.total_pnl || 0);

  const bots: BotStatus[] = [
    {
      name: "VEOE",
      href: "/money/veoe",
      label: "Options Trading",
      mode: "paper",
      value: veoeData?.account_value || 0,
      pnl: veoeData?.total_pnl || 0,
      pnlPct: veoeData?.total_pnl_pct || 0,
      positions: veoeData?.open_positions || 0,
      loading,
      error: errors.includes("VEOE API unreachable") ? "Unreachable" : null,
    },
    {
      name: "The Machine",
      href: "/money/crypto",
      label: "Multi-Strategy Crypto",
      mode: "paper",
      value: cryptoBalance?.total_usd || 0,
      pnl: cryptoStats?.total_pnl || 0,
      pnlPct: cryptoStats?.total_return_pct || 0,
      positions: 0,
      loading,
      error: errors.includes("Crypto API unreachable") ? "Unreachable" : null,
    },
  ];

  // Format equity data for charts
  const veoeChartData = veoeEquity.map((p) => ({
    time: p.date,
    value: p.value,
  }));

  const cryptoChartData = cryptoEquity.map((p) => ({
    time: p.timestamp.split("T")[0],
    value: p.equity,
  }));

  return (
    <AuthGate>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-gold mb-2">
          Portfolio Overview
        </p>
        <h2 className="text-3xl font-serif font-extrabold">
          Grow what&apos;s entrusted.
        </h2>
      </div>

      {/* Options CTA */}
      <Link
        href="/money/options"
        className="group relative block mb-8 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/5 via-navy-card to-gold/5 p-5 hover:border-gold/50 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] transition-all"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/[0.03] to-transparent animate-pulse pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-widest text-gold">
                Live — AI Options Finder
              </p>
            </div>
            <p className="text-lg font-serif font-bold text-cream">
              4 agents analyze. You trade the edge.
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Daily ranked plays with defined risk — highest conviction first
            </p>
          </div>
          <span className="hidden sm:flex items-center gap-1 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20 text-gold text-sm font-bold group-hover:bg-gold/20 group-hover:translate-x-0.5 transition-all">
            See Picks
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Link>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">
            {errors.join(" | ")} — data may be stale.
          </p>
        </div>
      )}

      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          label="Total Portfolio"
          value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          loading={loading}
        />
        <MetricCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend={totalPnl >= 0 ? "up" : "down"}
          loading={loading}
        />
        <MetricCard
          label="Active Strategies"
          value="2"
          subValue="VEOE + The Machine"
          loading={loading}
        />
      </div>

      {/* Bot cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {bots.map((bot) => (
          <Link
            key={bot.name}
            href={bot.href}
            className="group bg-navy-surface border border-navy-border rounded-2xl p-6 hover:border-gold-dark hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-serif font-bold">{bot.name}</h3>
                <p className="text-xs text-neutral-500">{bot.label}</p>
              </div>
              <StatusBadge mode={bot.mode} />
            </div>

            {bot.error ? (
              <div className="py-4">
                <p className="text-red-400 text-sm">{bot.error}</p>
              </div>
            ) : bot.loading ? (
              <div className="space-y-3">
                <div className="h-8 w-32 bg-navy-card rounded animate-pulse" />
                <div className="h-4 w-20 bg-navy-card rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-serif font-extrabold text-gold-gradient mb-1">
                  ${bot.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p
                  className={`text-sm font-mono ${
                    bot.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {bot.pnl >= 0 ? "+" : ""}${bot.pnl.toFixed(2)} (
                  {bot.pnlPct >= 0 ? "+" : ""}
                  {bot.pnlPct.toFixed(1)}%)
                </p>
                <p className="text-xs text-neutral-500 mt-2">
                  {bot.positions} open position{bot.positions !== 1 ? "s" : ""}
                </p>
              </>
            )}

            <div className="mt-4 pt-3 border-t border-navy-border flex items-center justify-between">
              <span className="text-xs text-neutral-500 group-hover:text-gold-light transition">
                View dashboard &rarr;
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Equity curves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <h3 className="text-lg font-serif font-bold mb-4">VEOE Equity</h3>
          <EquityChart data={veoeChartData} loading={loading} color="#c9a84c" />
        </div>
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <h3 className="text-lg font-serif font-bold mb-4">The Machine</h3>
          <EquityChart
            data={cryptoChartData}
            loading={loading}
            color="#5db56e"
          />
        </div>
      </div>
    </AuthGate>
  );
}
