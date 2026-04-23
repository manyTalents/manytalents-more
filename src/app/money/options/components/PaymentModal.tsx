"use client"

import { useState } from "react"
import { optionsApi } from "@/lib/options-api"
import type { Tier } from "@/lib/options-types"

interface Props {
  onClose: () => void
}

const TIERS: { tier: Tier; label: string; price: string; detail: string }[] = [
  { tier: 3, label: "Top 3 Picks", price: "$4.99", detail: "" },
  { tier: 5, label: "Top 5 Picks", price: "$5.98", detail: "(+$0.99)" },
  { tier: 10, label: "All 10 Picks", price: "$6.97", detail: "(+$0.99)" },
]

export default function PaymentModal({ onClose }: Props) {
  const [selected, setSelected] = useState<Tier>(3)
  const [mode, setMode] = useState<"one_time" | "subscription">("one_time")
  const [loading, setLoading] = useState(false)

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const { url } = await optionsApi.checkout(
        mode === "subscription" ? 10 : selected,
        mode
      )
      window.location.href = url
    } catch (err) {
      setLoading(false)
      alert(err instanceof Error ? err.message : "Checkout failed")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-card border border-navy-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-cream">
            Unlock Recommendations
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-cream text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* One-time tiers */}
        <div className="space-y-2 mb-4">
          {TIERS.map((t) => (
            <label
              key={t.tier}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                mode === "one_time" && selected === t.tier
                  ? "border-gold bg-gold/5"
                  : "border-navy-border hover:border-neutral-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="tier"
                  checked={mode === "one_time" && selected === t.tier}
                  onChange={() => {
                    setMode("one_time")
                    setSelected(t.tier)
                  }}
                  className="accent-gold"
                />
                <span className="text-sm text-cream">{t.label}</span>
              </div>
              <span className="text-sm font-mono text-cream">
                {t.price}{" "}
                {t.detail && (
                  <span className="text-neutral-500 text-xs">{t.detail}</span>
                )}
              </span>
            </label>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-navy-border" />
          <span className="text-xs text-neutral-500">OR</span>
          <div className="flex-1 h-px bg-navy-border" />
        </div>

        {/* Subscription */}
        <label
          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition mb-5 ${
            mode === "subscription"
              ? "border-gold bg-gold/5"
              : "border-navy-border hover:border-neutral-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="tier"
              checked={mode === "subscription"}
              onChange={() => setMode("subscription")}
              className="accent-gold"
            />
            <div>
              <span className="text-sm text-cream">Monthly</span>
              <p className="text-xs text-neutral-400">
                5 runs/day, all 10 picks
              </p>
            </div>
          </div>
          <span className="text-sm font-mono text-cream">$9.99/mo</span>
        </label>

        {/* Includes */}
        <p className="text-xs text-neutral-400 mb-4">
          Includes: Full trade structure, strikes, expiry, cost, 10 reasons,
          kill conditions, exit plan
        </p>

        {/* Checkout button */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gold hover:bg-gold-dark text-navy-bg font-bold text-sm transition disabled:opacity-50"
        >
          {loading ? "Redirecting to Stripe..." : "Pay with Stripe"}
        </button>

        <p className="text-center text-xs text-neutral-500 mt-3">
          One-time purchase. No subscription required.
        </p>
      </div>
    </div>
  )
}
