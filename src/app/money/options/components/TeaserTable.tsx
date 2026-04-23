"use client"

import type { TeaserRecommendation } from "@/lib/options-types"

interface Props {
  recommendations: TeaserRecommendation[]
  onUnlockClick: () => void
}

export default function TeaserTable({ recommendations, onUnlockClick }: Props) {
  return (
    <div className="rounded-xl border border-navy-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-navy-card/60 border-b border-navy-border">
        <h2 className="text-sm font-bold text-cream">
          {recommendations.length} Recommendations Ready
        </h2>
        <button
          onClick={onUnlockClick}
          className="px-4 py-1.5 rounded-lg bg-gold hover:bg-gold-dark text-navy-bg text-xs font-bold transition"
        >
          Unlock for $4.99
        </button>
      </div>

      {/* Table */}
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
            {recommendations.map((rec) => {
              const isVisible = rec.rank <= 3
              return (
                <tr
                  key={rec.id}
                  className="border-b border-navy-border/50 hover:bg-navy-card/40 transition cursor-pointer"
                  onClick={onUnlockClick}
                >
                  <td className="py-3 px-3 font-mono text-neutral-400 text-xs">
                    #{rec.rank}
                  </td>
                  <td className="py-3 px-3">
                    {isVisible ? (
                      <span
                        className={`font-mono font-bold ${
                          (rec.confidence || 0) >= 70
                            ? "text-emerald-400"
                            : (rec.confidence || 0) >= 60
                            ? "text-gold"
                            : "text-neutral-400"
                        }`}
                      >
                        {rec.confidence}%
                      </span>
                    ) : (
                      <span className="inline-block w-12 h-4 rounded bg-neutral-700/50 blur-[6px]" />
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-cream">
                    {isVisible ? (
                      rec.ticker
                    ) : (
                      <span className="inline-block w-10 h-4 rounded bg-neutral-700/50 blur-[6px]" />
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {isVisible ? (
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
                    ) : (
                      <span className="inline-block w-10 h-4 rounded bg-neutral-700/50 blur-[6px]" />
                    )}
                  </td>
                  {/* Structure, Expiry, Cost — always blurred */}
                  <td className="py-3 px-3">
                    <span className="inline-block w-24 h-4 rounded bg-neutral-700/50 blur-[6px]" />
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block w-16 h-4 rounded bg-neutral-700/50 blur-[6px]" />
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block w-14 h-4 rounded bg-neutral-700/50 blur-[6px]" />
                  </td>
                  <td className="py-3 px-3">
                    {isVisible ? (
                      <span className="font-mono text-emerald-400">
                        +{rec.expected_return_pct}%
                      </span>
                    ) : (
                      <span className="inline-block w-12 h-4 rounded bg-neutral-700/50 blur-[6px]" />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
