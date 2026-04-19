"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import AuthGate from "../components/AuthGate";
import { supabase } from "@/lib/supabase";
import { optionsApi } from "@/lib/options-api";
import type {
  Settings,
  AnalysisRun,
  Recommendation,
  Position,
} from "@/lib/options-types";

// ── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  return { toasts, addToast };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl px-4 py-3 text-sm font-medium shadow-xl border backdrop-blur-xl transition-all ${
            t.type === "success"
              ? "bg-emerald-950/90 border-emerald-800/60 text-emerald-300"
              : t.type === "error"
              ? "bg-red-950/90 border-red-800/60 text-red-300"
              : "bg-navy-card/90 border-navy-border text-cream/90"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 70
      ? "text-emerald-400"
      : value >= 60
      ? "text-gold"
      : "text-neutral-400";
  return <span className={`font-mono font-bold ${color}`}>{value}%</span>;
}

// ── Mode badge ───────────────────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: "paper" | "live" }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-semibold tracking-wide ${
        mode === "live"
          ? "bg-red-500/10 text-red-400 border border-red-500/20"
          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
      }`}
    >
      {mode.toUpperCase()}
    </span>
  );
}

// ── P&L display ──────────────────────────────────────────────────────────────

function PnlCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-500">—</span>;
  const color = value >= 0 ? "text-emerald-400" : "text-red-400";
  const prefix = value >= 0 ? "+" : "";
  return (
    <span className={`font-mono ${color}`}>
      {prefix}${value.toFixed(2)}
    </span>
  );
}

function PnlPctCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-500">—</span>;
  const color = value >= 0 ? "text-emerald-400" : "text-red-400";
  const prefix = value >= 0 ? "+" : "";
  return (
    <span className={`font-mono text-xs ${color}`}>
      {prefix}{value.toFixed(1)}%
    </span>
  );
}

// ── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-navy-border/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-4 rounded bg-navy-card animate-pulse w-full" />
        </td>
      ))}
    </tr>
  );
}

// ── Timeframe filter tabs ────────────────────────────────────────────────────

type Timeframe = "All" | "Short" | "Mid" | "Long";

function TimeframeTabs({
  active,
  onChange,
}: {
  active: Timeframe;
  onChange: (t: Timeframe) => void;
}) {
  const tabs: Timeframe[] = ["All", "Short", "Mid", "Long"];
  return (
    <div className="flex items-center gap-1">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1 text-xs rounded-lg transition font-medium ${
            active === t
              ? "bg-gold/10 text-gold border border-gold/20"
              : "text-neutral-500 hover:text-cream/70 hover:bg-navy-card"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ── Expandable recommendation row ────────────────────────────────────────────

function RecommendationRow({
  rec,
  onExecute,
  onReject,
}: {
  rec: Recommendation;
  onExecute: (rec: Recommendation) => void;
  onReject: (rec: Recommendation) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-navy-border/50 hover:bg-navy-card/40 transition cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="py-3 px-3 font-mono text-neutral-400 text-xs">
          #{rec.rank}
        </td>
        <td className="py-3 px-3">
          <ConfidenceBadge value={rec.confidence} />
        </td>
        <td className="py-3 px-3 font-bold">{rec.ticker}</td>
        <td className="py-3 px-3 text-xs text-neutral-400 capitalize">
          {rec.direction}
        </td>
        <td className="py-3 px-3 text-xs text-neutral-300 max-w-[180px] truncate">
          {rec.structure_description}
        </td>
        <td className="py-3 px-3 font-mono text-xs text-neutral-400">
          {rec.expiry}
        </td>
        <td className="py-3 px-3 font-mono text-xs text-right">
          ${rec.cost_per_contract.toFixed(2)}
        </td>
        <td className="py-3 px-3 font-mono text-xs text-right">
          <span
            className={
              rec.expected_return_pct >= 0 ? "text-emerald-400" : "text-red-400"
            }
          >
            +{rec.expected_return_pct.toFixed(1)}%
          </span>
        </td>
        <td className="py-3 px-3">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              rec.status === "pending"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : rec.status === "executed"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
            }`}
          >
            {rec.status}
          </span>
        </td>
        <td
          className="py-3 px-3"
          onClick={(e) => e.stopPropagation()}
        >
          {rec.status === "pending" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExecute(rec)}
                className="text-xs px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
              >
                Execute
              </button>
              <button
                onClick={() => onReject(rec)}
                className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
              >
                Reject
              </button>
            </div>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-navy-border/50 bg-navy-card/30">
          <td colSpan={10} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reasons */}
              <div>
                <p className="text-xs uppercase tracking-wider text-gold mb-2 font-semibold">
                  Reasons
                </p>
                <ol className="space-y-1">
                  {rec.reasons.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs text-neutral-300 flex gap-2"
                    >
                      <span className="text-neutral-600 font-mono shrink-0">
                        {i + 1}.
                      </span>
                      {r}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Kill conditions */}
              <div>
                <p className="text-xs uppercase tracking-wider text-red-400 mb-2 font-semibold">
                  Kill Conditions
                </p>
                <ul className="space-y-1">
                  {rec.kill_conditions.map((k, i) => (
                    <li
                      key={i}
                      className="text-xs text-neutral-400 flex gap-2"
                    >
                      <span className="text-red-600 shrink-0">x</span>
                      {k}
                    </li>
                  ))}
                </ul>

                {rec.verify_url && (
                  <a
                    href={rec.verify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-xs text-gold hover:text-gold-light underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Verify on Barchart
                  </a>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function OptionsPage() {
  const { toasts, addToast } = useToasts();

  // Settings
  const [settings, setSettings] = useState<Settings | null>(null);
  const [modeLoading, setModeLoading] = useState(false);

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [lastRun, setLastRun] = useState<AnalysisRun | null>(null);

  // Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("All");
  const [recsLoading, setRecsLoading] = useState(true);

  // Positions
  const [positions, setPositions] = useState<Position[]>([]);
  const [posLoading, setPosLoading] = useState(true);

  // ── Load initial data ─────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (data) setSettings(data as Settings);
  }, []);

  const loadLastRun = useCallback(async () => {
    const { data } = await supabase
      .from("analysis_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();
    if (data) setLastRun(data as AnalysisRun);
  }, []);

  const loadRecommendations = useCallback(async () => {
    setRecsLoading(true);
    const { data } = await supabase
      .from("recommendations")
      .select("*")
      .order("rank", { ascending: true });
    if (data) setRecommendations(data as Recommendation[]);
    setRecsLoading(false);
  }, []);

  const loadPositions = useCallback(async () => {
    setPosLoading(true);
    const { data } = await supabase
      .from("positions")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false });
    if (data) setPositions(data as Position[]);
    setPosLoading(false);
  }, []);

  useEffect(() => {
    loadSettings();
    loadLastRun();
    loadRecommendations();
    loadPositions();
  }, [loadSettings, loadLastRun, loadRecommendations, loadPositions]);

  // ── Realtime subscriptions ────────────────────────────────────────────────

  useEffect(() => {
    const posChannel = supabase
      .channel("options-positions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "positions" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setPositions((prev) =>
              prev.map((p) =>
                p.id === (payload.new as Position).id
                  ? (payload.new as Position)
                  : p
              )
            );
          } else if (payload.eventType === "INSERT") {
            const inserted = payload.new as Position;
            if (inserted.status === "open") {
              setPositions((prev) => [inserted, ...prev]);
            }
          } else if (payload.eventType === "DELETE") {
            setPositions((prev) =>
              prev.filter((p) => p.id !== (payload.old as Position).id)
            );
          }
        }
      )
      .subscribe();

    const runsChannel = supabase
      .channel("options-runs")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "analysis_runs" },
        (payload) => {
          const updated = payload.new as AnalysisRun;
          setLastRun(updated);
          if (updated.status === "done") {
            setAnalyzing(false);
            addToast("Analysis complete — new recommendations loaded.", "success");
            loadRecommendations();
          } else if (updated.status === "error") {
            setAnalyzing(false);
            addToast(
              `Analysis failed: ${updated.error_message || "Unknown error"}`,
              "error"
            );
          }
        }
      )
      .subscribe();

    const recsChannel = supabase
      .channel("options-recs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recommendations" },
        (payload) => {
          const rec = payload.new as Recommendation;
          setRecommendations((prev) => {
            const exists = prev.find((r) => r.id === rec.id);
            if (exists) return prev;
            return [...prev, rec].sort((a, b) => a.rank - b.rank);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(posChannel);
      supabase.removeChannel(runsChannel);
      supabase.removeChannel(recsChannel);
    };
  }, [addToast, loadRecommendations]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await optionsApi.analyze();
      addToast(`Analysis started (run ${result.run_id.slice(0, 8)}...)`, "info");
    } catch (err) {
      setAnalyzing(false);
      addToast(
        err instanceof Error ? err.message : "Failed to start analysis",
        "error"
      );
    }
  };

  const handleModeToggle = async () => {
    if (!settings) return;
    const targetMode = settings.mode === "paper" ? "live" : "paper";

    if (targetMode === "live") {
      const confirmed = window.confirm(
        "Switch to LIVE mode?\n\nThis will execute real trades with real money. Are you absolutely sure?"
      );
      if (!confirmed) return;
    }

    setModeLoading(true);
    const { error } = await supabase
      .from("settings")
      .update({ mode: targetMode })
      .eq("id", 1);

    if (error) {
      addToast("Failed to update mode.", "error");
    } else {
      setSettings((prev) => (prev ? { ...prev, mode: targetMode } : prev));
      addToast(
        `Switched to ${targetMode.toUpperCase()} mode.`,
        targetMode === "live" ? "error" : "success"
      );
    }
    setModeLoading(false);
  };

  const handleExecute = async (rec: Recommendation) => {
    const qtyStr = window.prompt(
      `Execute: ${rec.ticker} — ${rec.structure_description}\nCost per contract: $${rec.cost_per_contract.toFixed(2)}\n\nEnter quantity:`
    );
    if (!qtyStr) return;
    const quantity = parseInt(qtyStr, 10);
    if (isNaN(quantity) || quantity < 1) {
      addToast("Invalid quantity.", "error");
      return;
    }

    if (settings?.mode === "live") {
      const confirmed = window.confirm(
        `LIVE MODE: Execute ${quantity}x ${rec.ticker} contracts?\nTotal cost: ~$${(rec.cost_per_contract * quantity).toFixed(2)}\n\nThis is a real trade.`
      );
      if (!confirmed) return;
    }

    try {
      const result = await optionsApi.execute({
        recommendation_id: rec.id,
        quantity,
      });
      if (result.status === "ok") {
        addToast(
          `Executed ${rec.ticker} x${quantity}${result.warning ? ` — Warning: ${result.warning}` : ""}`,
          "success"
        );
        // Optimistically update rec status
        setRecommendations((prev) =>
          prev.map((r) =>
            r.id === rec.id ? { ...r, status: "executed" } : r
          )
        );
        loadPositions();
      } else {
        addToast(`Execute failed: ${result.message}`, "error");
      }
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Execute request failed",
        "error"
      );
    }
  };

  const handleReject = async (rec: Recommendation) => {
    const { error } = await supabase
      .from("recommendations")
      .update({ status: "skipped" })
      .eq("id", rec.id);

    if (error) {
      addToast("Failed to reject recommendation.", "error");
    } else {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: "skipped" } : r))
      );
      addToast(`Rejected ${rec.ticker} recommendation.`, "info");
    }
  };

  const handleForceExit = async (pos: Position) => {
    const confirmed = window.confirm(
      `Force exit: ${pos.ticker} x${pos.quantity}?\n${pos.mode === "live" ? "This is a LIVE position — real order will be placed." : "Paper position — no real order."}`
    );
    if (!confirmed) return;

    try {
      const result = await optionsApi.close(pos.id);
      if (result.status === "ok") {
        addToast(
          `Closed ${pos.ticker}${result.realized_pnl !== undefined ? ` — P&L: $${result.realized_pnl.toFixed(2)}` : ""}`,
          "success"
        );
        setPositions((prev) => prev.filter((p) => p.id !== pos.id));
      } else {
        addToast("Close request failed.", "error");
      }
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Close request failed",
        "error"
      );
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredRecs = recommendations.filter((r) => {
    if (timeframe === "All") return true;
    const tf = r.timeframe.toLowerCase();
    if (timeframe === "Short") return tf.includes("short") || tf.includes("week");
    if (timeframe === "Mid") return tf.includes("mid") || tf.includes("month");
    if (timeframe === "Long") return tf.includes("long") || tf.includes("quarter");
    return true;
  });

  const openCount = positions.length;
  const totalPnl = positions.reduce(
    (sum, p) => sum + (p.unrealized_pnl ?? 0),
    0
  );

  const lastRunTime = lastRun?.completed_at
    ? new Date(lastRun.completed_at).toLocaleString()
    : lastRun?.started_at
    ? new Date(lastRun.started_at).toLocaleString()
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthGate>
      <ToastContainer toasts={toasts} />

      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-gold mb-2">
          Options Trading
        </p>
        <h2 className="text-3xl font-serif font-extrabold">
          Options Dashboard
        </h2>
      </div>

      {/* ── Control Bar ──────────────────────────────────────────────────── */}
      <div className="bg-navy-surface border border-navy-border rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Run Analysis */}
        <button
          onClick={handleRunAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold text-navy font-bold text-sm hover:bg-gold-light disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {analyzing && (
            <span className="h-4 w-4 rounded-full border-2 border-navy border-t-transparent animate-spin" />
          )}
          {analyzing ? "Analyzing..." : "Run Analysis"}
        </button>

        {/* Mode toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 uppercase tracking-wide">
            Mode
          </span>
          <button
            onClick={handleModeToggle}
            disabled={modeLoading || !settings}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
              settings?.mode === "live" ? "bg-red-600" : "bg-emerald-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings?.mode === "live" ? "translate-x-8" : "translate-x-1"
              }`}
            />
          </button>
          {settings && <ModeBadge mode={settings.mode} />}
        </div>

        {/* Last run info */}
        <div className="sm:ml-auto text-right">
          {lastRun ? (
            <>
              <p className="text-xs text-neutral-500">
                Last run:{" "}
                <span className="text-cream/70">{lastRunTime}</span>
              </p>
              <p className="text-xs">
                <span
                  className={`font-medium ${
                    lastRun.status === "done"
                      ? "text-emerald-400"
                      : lastRun.status === "error"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {lastRun.status === "running" && analyzing
                    ? "Running..."
                    : lastRun.status}
                </span>
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-600">No analysis run yet</p>
          )}
        </div>
      </div>

      {/* ── Recommendations Table ─────────────────────────────────────────── */}
      <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-serif font-bold">Recommendations</h3>
            <span className="text-xs text-neutral-500 font-mono">
              {filteredRecs.length} result{filteredRecs.length !== 1 ? "s" : ""}
            </span>
          </div>
          <TimeframeTabs active={timeframe} onChange={setTimeframe} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-border text-neutral-500 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-3 font-medium">Rank</th>
                <th className="text-left py-3 px-3 font-medium">Conf.</th>
                <th className="text-left py-3 px-3 font-medium">Ticker</th>
                <th className="text-left py-3 px-3 font-medium">Type</th>
                <th className="text-left py-3 px-3 font-medium">Structure</th>
                <th className="text-left py-3 px-3 font-medium">Expiry</th>
                <th className="text-right py-3 px-3 font-medium">Cost</th>
                <th className="text-right py-3 px-3 font-medium">Exp. Ret.</th>
                <th className="text-left py-3 px-3 font-medium">Status</th>
                <th className="text-left py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} cols={10} />
                ))
              ) : filteredRecs.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-12 text-center text-neutral-600 text-sm"
                  >
                    No recommendations yet — run an analysis to generate them.
                  </td>
                </tr>
              ) : (
                filteredRecs.map((rec) => (
                  <RecommendationRow
                    key={rec.id}
                    rec={rec}
                    onExecute={handleExecute}
                    onReject={handleReject}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Positions Table ───────────────────────────────────────────────── */}
      <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-serif font-bold">Positions</h3>
            <span className="text-xs text-neutral-500 font-mono">
              {openCount} open
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-neutral-500 mr-2">Total P&L</span>
            <span
              className={`font-mono font-bold text-sm ${
                totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-border text-neutral-500 text-xs uppercase tracking-wider">
                <th className="text-left py-3 px-3 font-medium">Ticker</th>
                <th className="text-left py-3 px-3 font-medium">Structure</th>
                <th className="text-right py-3 px-3 font-medium">Qty</th>
                <th className="text-left py-3 px-3 font-medium">Mode</th>
                <th className="text-right py-3 px-3 font-medium">Entry</th>
                <th className="text-right py-3 px-3 font-medium">Current</th>
                <th className="text-right py-3 px-3 font-medium">P&L ($)</th>
                <th className="text-right py-3 px-3 font-medium">P&L (%)</th>
                <th className="text-left py-3 px-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonRow key={i} cols={9} />
                ))
              ) : positions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-12 text-center text-neutral-600 text-sm"
                  >
                    No open positions.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <tr
                    key={pos.id}
                    className="border-b border-navy-border/50 hover:bg-navy-card/40 transition"
                  >
                    <td className="py-3 px-3 font-bold">{pos.ticker}</td>
                    <td className="py-3 px-3 text-xs text-neutral-400 max-w-[160px] truncate">
                      {pos.structure_description}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {pos.quantity}
                    </td>
                    <td className="py-3 px-3">
                      <ModeBadge mode={pos.mode} />
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      ${pos.entry_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {pos.current_price !== null
                        ? `$${pos.current_price.toFixed(2)}`
                        : "—"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <PnlCell value={pos.unrealized_pnl ?? null} />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <PnlPctCell value={pos.unrealized_pnl_pct ?? null} />
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => handleForceExit(pos)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition"
                      >
                        Force Exit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AuthGate>
  );
}
