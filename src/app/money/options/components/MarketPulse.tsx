"use client"

interface Props {
  macroSummary: string | null
}

export default function MarketPulse({ macroSummary }: Props) {
  if (!macroSummary) return null

  return (
    <div className="rounded-xl border border-navy-border bg-navy-card/50 p-4 mb-6">
      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
        Market Pulse
      </h3>
      <p className="text-sm text-cream/80 leading-relaxed">{macroSummary}</p>
    </div>
  )
}
