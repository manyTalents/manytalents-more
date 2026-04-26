import { createServiceClient } from "@/lib/supabase"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = createServiceClient()
  const { data: rec } = await supabase
    .from("recommendations")
    .select("ticker, direction, confidence")
    .eq("id", id)
    .single()

  if (!rec) return { title: "Recommendation | MTM Options" }

  return {
    title: `${rec.ticker} ${rec.direction} (${rec.confidence}% confidence) | MTM Options`,
    description: `AI-generated options analysis for ${rec.ticker}. Confidence: ${rec.confidence}%. Direction: ${rec.direction}.`,
  }
}

export default async function RationalePage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: rec } = await supabase
    .from("recommendations")
    .select("id, ticker, direction, confidence, rationale, reasons, kill_conditions, rank, run_id, created_at, expected_return_pct, verify_url")
    .eq("id", id)
    .single()

  if (!rec) notFound()

  const reasons: string[] = Array.isArray(rec.reasons) ? rec.reasons : []
  const killConditions: string[] = Array.isArray(rec.kill_conditions)
    ? rec.kill_conditions
    : []

  return (
    <div className="min-h-screen bg-navy-bg">
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-2xl font-bold text-cream">
              {rec.ticker}
            </span>
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium ${
                rec.direction === "bull"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : rec.direction === "bear"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
              }`}
            >
              {rec.direction}
            </span>
            <span className="font-mono text-lg text-gold">
              {rec.confidence}%
            </span>
          </div>
          <p className="text-sm text-neutral-400">
            Expected return: +{rec.expected_return_pct}% &middot; Rank #
            {rec.rank}
          </p>
        </div>

        {/* Reasons */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-cream uppercase tracking-wide mb-3">
            Thesis ({reasons.length} Reasons)
          </h2>
          <ol className="space-y-2">
            {reasons.map((reason, i) => (
              <li
                key={i}
                className="text-sm text-cream/80 pl-6 relative"
              >
                <span className="absolute left-0 text-gold font-mono text-xs">
                  {i + 1}.
                </span>
                {reason}
              </li>
            ))}
          </ol>
        </section>

        {/* Kill Conditions */}
        <section className="mb-8">
          <h2 className="text-sm font-bold text-cream uppercase tracking-wide mb-3">
            Kill Conditions
          </h2>
          <ul className="space-y-1">
            {killConditions.map((kc, i) => (
              <li
                key={i}
                className="text-sm text-red-300/80 pl-4 relative"
              >
                <span className="absolute left-0 text-red-400">×</span>
                {kc}
              </li>
            ))}
          </ul>
        </section>

        {/* Verify link */}
        {rec.verify_url && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-cream uppercase tracking-wide mb-3">
              Verify
            </h2>
            <a
              href={rec.verify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gold hover:text-gold-dark underline"
            >
              {rec.verify_url}
            </a>
          </section>
        )}

        {/* Gated section — trade details (data NOT rendered, requires purchase) */}
        <section className="rounded-xl border border-navy-border p-6 bg-navy-card/30 mb-8">
          <h2 className="text-sm font-bold text-cream uppercase tracking-wide mb-3">
            Trade Details
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Structure</span>
              <span className="text-neutral-500 italic">Locked</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Strikes</span>
              <span className="text-neutral-500 italic">Locked</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Expiry</span>
              <span className="text-neutral-500 italic">Locked</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Cost</span>
              <span className="text-neutral-500 italic">Locked</span>
            </div>
          </div>
          <a
            href="/money/options"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-gold hover:bg-gold-dark text-navy-bg text-sm font-bold transition"
          >
            Unlock Trade Details →
          </a>
        </section>

        {/* Disclaimer footer */}
        <footer className="pt-6 border-t border-navy-border/50">
          <p className="text-xs text-neutral-500">
            Not investment advice. The information provided may aid your own
            research but should not be relied upon for making financial
            decisions. All strategies use defined risk. Max loss is always known
            before entry.
          </p>
          <p className="text-xs text-neutral-600 mt-2">
            © {new Date().getFullYear()} ManyTalents More
          </p>
        </footer>
      </main>
    </div>
  )
}
