"use client"

interface MacroSummary {
  vix: number
  fed_rate: string
  headline: string
  key_risks: string[]
}

interface Props {
  macroSummary: MacroSummary | string | null
}

export default function MarketPulse({ macroSummary }: Props) {
  if (!macroSummary) return null

  // Handle both string (legacy) and object (current) formats
  if (typeof macroSummary === "string") {
    return (
      <div className="rounded-xl border border-navy-border bg-navy-card/50 p-4 mb-6">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
          Market Pulse
        </h3>
        <p className="text-sm text-cream/80 leading-relaxed">{macroSummary}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-navy-border bg-navy-card/50 p-4 mb-6">
      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
        Market Pulse
      </h3>
      <p className="text-sm text-cream/80 leading-relaxed mb-3">{macroSummary.headline}</p>
      <div className="flex items-center gap-4 text-xs mb-3">
        <span className="px-2 py-0.5 rounded-full bg-navy-bg border border-navy-border text-neutral-300">
          VIX {macroSummary.vix}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-navy-bg border border-navy-border text-neutral-300">
          Fed {macroSummary.fed_rate}
        </span>
      </div>
      {macroSummary.key_risks.length > 0 && (
        <ul className="space-y-1">
          {macroSummary.key_risks.map((risk, i) => (
            <li key={i} className="text-xs text-red-300/70 flex gap-1.5">
              <span className="text-red-400 shrink-0">×</span>
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
