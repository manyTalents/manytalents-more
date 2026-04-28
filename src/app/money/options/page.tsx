"use client"

import { Suspense, useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { optionsApi } from "@/lib/options-api"
import {
  isAdmin as checkIsAdmin,
  hasAcknowledgedDisclaimer,
  getPurchaseForRun,
  setPurchaseForRun,
  getSubscription,
} from "@/lib/options-access"
import type {
  Recommendation,
  Position,
  TeaserRecommendation,
  RunStatus,
} from "@/lib/options-types"
import MoneyNav from "../components/MoneyNav"
import MarketPulse from "./components/MarketPulse"
import TeaserTable from "./components/TeaserTable"
import PaymentModal from "./components/PaymentModal"
import DisclaimerModal from "./components/DisclaimerModal"
import RunProgress from "./components/RunProgress"
import AdminLogin from "./components/AdminLogin"

// ── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number
  message: string
  type: "success" | "error" | "info"
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = ++counter.current
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
    },
    []
  )
  return { toasts, addToast }
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null
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
  )
}

// ── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 70
      ? "text-emerald-400"
      : value >= 60
      ? "text-gold"
      : "text-neutral-400"
  return <span className={`font-mono font-bold ${color}`}>{value}%</span>
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OptionsPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-navy-bg flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>}>
      <OptionsPage />
    </Suspense>
  )
}

function OptionsPage() {
  const searchParams = useSearchParams()
  const { toasts, addToast } = useToasts()

  // Access state
  const [adminMode, setAdminMode] = useState(false)
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null)
  const [subEmail, setSubEmail] = useState<string | null>(null)

  // UI state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [isRealRun, setIsRealRun] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  // Data
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null)
  const [teaserRecs, setTeaserRecs] = useState<TeaserRecommendation[]>([])
  const [fullRecs, setFullRecs] = useState<Recommendation[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [macroSummary, setMacroSummary] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [accessTier, setAccessTier] = useState(0)

  // Check access on mount / URL params change
  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    const isAdm = checkIsAdmin()
    const sub = getSubscription()

    setAdminMode(isAdm)
    if (sub) setSubEmail(sub.email)
    if (sessionId) setPaidSessionId(sessionId)

    if (isAdm || sub || sessionId) {
      setHasAccess(true)
    }
  }, [searchParams])

  // Load teaser data (public — always)
  useEffect(() => {
    loadTeaser()
    loadRunStatus()
  }, [])

  // Load full recommendations when access is confirmed
  useEffect(() => {
    if (hasAccess && (paidSessionId || adminMode || subEmail)) {
      loadFullRecommendations()
    }
  }, [hasAccess, paidSessionId, adminMode, subEmail])

  // Supabase Realtime for positions (only when admin/paid)
  useEffect(() => {
    if (!hasAccess) return
    loadPositions()

    const channel = supabase
      .channel("positions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "positions" },
        () => loadPositions()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hasAccess])

  async function loadTeaser() {
    try {
      const { data } = await supabase
        .from("recommendations")
        .select("id, rank, ticker, direction, confidence, expected_return_pct, run_id")
        .order("rank", { ascending: true })
        .limit(10)

      if (data && data.length > 0) {
        const teaser: TeaserRecommendation[] = data.map((r: any) => ({
          id: r.id,
          rank: r.rank,
          ticker: r.rank <= 3 ? r.ticker : null,
          direction: r.rank <= 3 ? r.direction : null,
          confidence: r.rank <= 3 ? r.confidence : null,
          expected_return_pct: r.rank <= 3 ? r.expected_return_pct : null,
        }))
        setTeaserRecs(teaser)

        const { data: run } = await supabase
          .from("analysis_runs")
          .select("macro_summary")
          .eq("id", data[0].run_id)
          .single()
        if (run) setMacroSummary(run.macro_summary)
      }
    } catch (err) {
      console.error("Failed to load teaser:", err)
    }
  }

  async function loadRunStatus() {
    try {
      const status = await optionsApi.getRunStatus()
      setRunStatus(status)
    } catch (err) {
      console.error("Failed to load run status:", err)
    }
  }

  async function loadFullRecommendations() {
    try {
      const data = await optionsApi.getRecommendations({
        sessionId: paidSessionId || undefined,
        adminToken: adminMode ? process.env.NEXT_PUBLIC_ADMIN_TOKEN || "admin" : undefined,
        subEmail: subEmail || undefined,
      })

      if (data.recommendations) {
        setFullRecs(data.recommendations)
        setAccessTier(data.tier)
        if (data.run_id && paidSessionId) {
          setPurchaseForRun(data.run_id, data.tier)
        }
      }
    } catch (err) {
      console.error("Failed to load recommendations:", err)
    }
  }

  async function loadPositions() {
    const { data } = await supabase
      .from("positions")
      .select("*")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
    if (data) setPositions(data)
  }

  function handleRunClick() {
    if (!hasAcknowledgedDisclaimer()) {
      setShowDisclaimer(true)
      return
    }
    if (!hasAccess) {
      setShowPaymentModal(true)
      return
    }
    // Check if user has already seen this run
    if (runStatus?.has_cached_run && runStatus.run_id) {
      const existing = getPurchaseForRun(runStatus.run_id)
      if (existing && !adminMode) {
        addToast(
          `Next analysis available in ${Math.ceil((runStatus.next_available_in_seconds || 0) / 60)} minutes`,
          "info"
        )
        return
      }
    }
    const needsRealRun = !runStatus?.has_cached_run
    setIsRealRun(needsRealRun)
    setShowProgress(true)

    if (needsRealRun) {
      optionsApi.analyze()
        .then((res) => setActiveRunId(res.run_id))
        .catch((err) => {
          setShowProgress(false)
          addToast(`Analysis failed to start: ${err.message}`, "error")
        })
    }
  }

  function handleProgressComplete() {
    setShowProgress(false)
    setActiveRunId(null)
    loadTeaser()
    loadRunStatus()
    loadFullRecommendations()
    addToast("Analysis complete — recommendations ready", "success")
  }

  function handleProgressError(message: string) {
    setShowProgress(false)
    setActiveRunId(null)
    addToast(message, "error")
  }

  function handleDisclaimerAcknowledge() {
    setShowDisclaimer(false)
    if (!hasAccess) {
      setShowPaymentModal(true)
    }
  }

  function handleAdminSuccess() {
    setAdminMode(true)
    setHasAccess(true)
    addToast("Admin access granted", "success")
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-navy-bg">
      <MoneyNav />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <ToastContainer toasts={toasts} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-cream mb-1">
            The Edge Is in the Data
          </h1>
          <p className="text-sm text-neutral-400">
            Four specialized AI agents research, rank, and surface the
            highest-conviction options plays daily.
          </p>
        </div>

        {/* Market Pulse (always visible) */}
        <MarketPulse macroSummary={macroSummary} />

        {/* Run button (visible to paid users / admin) */}
        {hasAccess && !showProgress && (
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={handleRunClick}
              className="px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-dark text-navy-bg font-bold text-sm transition"
            >
              Run Analysis
            </button>
            {runStatus?.has_cached_run &&
              runStatus.next_available_in_seconds &&
              !adminMode && (
                <span className="text-xs text-neutral-400">
                  Last analysis:{" "}
                  {new Date(runStatus.completed_at!).toLocaleTimeString()}{" "}
                  &middot; Next in{" "}
                  {Math.ceil(runStatus.next_available_in_seconds / 60)}m
                </span>
              )}
            {adminMode && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                ADMIN
              </span>
            )}
          </div>
        )}

        {/* Progress animation */}
        {showProgress && (
          <div className="mb-6">
            <RunProgress
              isReal={isRealRun}
              runId={activeRunId}
              onComplete={handleProgressComplete}
              onError={handleProgressError}
            />
          </div>
        )}

        {/* Content: Full recs (paid) or Teaser (public) */}
        {hasAccess && fullRecs.length > 0 ? (
          <FullRecommendationsTable
            recommendations={fullRecs}
            positions={positions}
            addToast={addToast}
          />
        ) : (
          <>
            <TeaserTable
              recommendations={teaserRecs}
              onUnlockClick={() => {
                if (!hasAcknowledgedDisclaimer()) {
                  setShowDisclaimer(true)
                } else {
                  setShowPaymentModal(true)
                }
              }}
            />

            {/* Trust section */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-navy-border p-4">
                <h3 className="text-sm font-bold text-cream mb-1">
                  1. AI Squad Analyzes
                </h3>
                <p className="text-xs text-neutral-400">
                  Macro, flow, fundamentals & risk — four specialized agents
                  research in parallel.
                </p>
              </div>
              <div className="rounded-xl border border-navy-border p-4">
                <h3 className="text-sm font-bold text-cream mb-1">
                  2. Ranks by Confidence
                </h3>
                <p className="text-xs text-neutral-400">
                  Each opportunity scored 0-100% with defined-risk structures and
                  max loss always known.
                </p>
              </div>
              <div className="rounded-xl border border-navy-border p-4">
                <h3 className="text-sm font-bold text-cream mb-1">
                  3. You Trade
                </h3>
                <p className="text-xs text-neutral-400">
                  Get specific strikes, expiry, cost, and exit plan — ready to
                  execute on your broker.
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-neutral-500 mt-6">
              One-time purchase. No subscription required.
            </p>
          </>
        )}

        {/* Footer with admin link */}
        <footer className="mt-12 pt-6 border-t border-navy-border/50 flex items-center justify-between">
          <p className="text-xs text-neutral-600">
            Not investment advice. All strategies use defined risk.
          </p>
          <AdminLogin onSuccess={handleAdminSuccess} />
        </footer>

        {/* Modals */}
        {showDisclaimer && (
          <DisclaimerModal onAcknowledge={handleDisclaimerAcknowledge} />
        )}
        {showPaymentModal && (
          <PaymentModal onClose={() => setShowPaymentModal(false)} />
        )}
      </main>
    </div>
  )
}

// ── Full Recommendations Table (paid users) ──────────────────────────────────

function FullRecommendationsTable({
  recommendations,
  positions,
  addToast,
}: {
  recommendations: Recommendation[]
  positions: Position[]
  addToast: (msg: string, type: "success" | "error" | "info") => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {/* Recommendations */}
      <div className="rounded-xl border border-navy-border overflow-hidden">
        <div className="px-4 py-3 bg-navy-card/60 border-b border-navy-border">
          <h2 className="text-sm font-bold text-cream">
            Recommendations ({recommendations.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-border/50 text-neutral-400 text-xs">
                <th className="py-2 px-3 text-left">#</th>
                <th className="py-2 px-3 text-left">Confidence</th>
                <th className="py-2 px-3 text-left">Ticker</th>
                <th className="py-2 px-3 text-left">Direction</th>
                <th className="py-2 px-3 text-left">Structure</th>
                <th className="py-2 px-3 text-left">Expiry</th>
                <th className="py-2 px-3 text-left">Cost</th>
                <th className="py-2 px-3 text-left">Exp. Return</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec) => (
                <>
                  <tr
                    key={rec.id}
                    className="border-b border-navy-border/50 hover:bg-navy-card/40 transition cursor-pointer"
                    onClick={() =>
                      setExpanded(expanded === rec.id ? null : rec.id)
                    }
                  >
                    <td className="py-3 px-3 font-mono text-neutral-400 text-xs">
                      #{rec.rank}
                    </td>
                    <td className="py-3 px-3">
                      <ConfidenceBadge value={rec.confidence} />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-cream">
                      {rec.ticker}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          rec.direction === "bull"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : rec.direction === "bear"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-neutral-500/10 text-neutral-400"
                        }`}
                      >
                        {rec.direction}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-cream/80 text-xs">
                      {rec.structure_description}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-neutral-300">
                      {rec.expiry}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-neutral-300">
                      ${rec.cost_per_contract}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-emerald-400">
                        +{rec.expected_return_pct}%
                      </span>
                    </td>
                  </tr>
                  {expanded === rec.id && (
                    <tr key={`${rec.id}-details`} className="bg-navy-card/30">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <h4 className="font-semibold text-cream mb-2">
                              Reasons
                            </h4>
                            <ol className="space-y-1 text-cream/70">
                              {(rec.reasons || []).map((r, i) => (
                                <li key={i}>
                                  <span className="text-gold font-mono mr-1">
                                    {i + 1}.
                                  </span>
                                  {r}
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <h4 className="font-semibold text-cream mb-2">
                              Kill Conditions
                            </h4>
                            <ul className="space-y-1 text-red-300/70">
                              {(rec.kill_conditions || []).map((kc, i) => (
                                <li key={i}>× {kc}</li>
                              ))}
                            </ul>
                            {rec.verify_url && (
                              <a
                                href={rec.verify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-3 text-gold hover:text-gold-dark underline"
                              >
                                Verify thesis →
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Positions */}
      {positions.length > 0 && (
        <div className="rounded-xl border border-navy-border overflow-hidden">
          <div className="px-4 py-3 bg-navy-card/60 border-b border-navy-border">
            <h2 className="text-sm font-bold text-cream">
              Positions ({positions.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border/50 text-neutral-400 text-xs">
                  <th className="py-2 px-3 text-left">Ticker</th>
                  <th className="py-2 px-3 text-left">Structure</th>
                  <th className="py-2 px-3 text-left">Entry</th>
                  <th className="py-2 px-3 text-left">Current</th>
                  <th className="py-2 px-3 text-left">P&L</th>
                  <th className="py-2 px-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => (
                  <tr key={pos.id} className="border-b border-navy-border/50">
                    <td className="py-3 px-3 font-mono font-bold text-cream">
                      {pos.ticker}
                    </td>
                    <td className="py-3 px-3 text-cream/80 text-xs">
                      {pos.structure_description}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-neutral-300">
                      ${pos.entry_price}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-neutral-300">
                      {pos.current_price ? `$${pos.current_price}` : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-mono text-xs ${
                          (pos.unrealized_pnl_pct || 0) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {(pos.unrealized_pnl_pct || 0) >= 0 ? "+" : ""}
                        {pos.unrealized_pnl_pct?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                        {pos.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
