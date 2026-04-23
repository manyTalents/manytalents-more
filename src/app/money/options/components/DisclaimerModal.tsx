"use client"

import { setDisclaimerAcknowledged } from "@/lib/options-access"

interface Props {
  onAcknowledge: () => void
}

export default function DisclaimerModal({ onAcknowledge }: Props) {
  const handleAcknowledge = () => {
    setDisclaimerAcknowledged()
    onAcknowledge()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-navy-card border border-navy-border rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
        <h2 className="text-xl font-bold text-cream mb-4">Disclaimer</h2>
        <p className="text-cream/80 text-sm leading-relaxed mb-6">
          The information provided is not investment advice and should not be
          relied upon for making financial decisions. It may aid your own
          research.
        </p>
        <button
          onClick={handleAcknowledge}
          className="w-full py-3 rounded-xl bg-gold hover:bg-gold-dark text-navy-bg font-bold text-sm transition"
        >
          I Acknowledge
        </button>
      </div>
    </div>
  )
}
