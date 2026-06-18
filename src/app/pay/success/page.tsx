"use client";

/**
 * /pay/success — public confirmation page for Stripe Checkout pay-link flow.
 *
 * Stripe redirects here with ?invoice=<name>&session_id=<id> after a
 * successful customer payment. Payment recording happens server-side via
 * the Stripe webhook (checkout.session.completed). This page is purely
 * informational — no further action needed.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SuccessContent() {
  const params = useSearchParams();
  const invoiceName = params.get("invoice") ?? "";

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Checkmark */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-emerald-900/40 border-2 border-emerald-600 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Received</h1>
          {invoiceName && (
            <p className="text-neutral-400 text-sm">
              Invoice{" "}
              <span className="font-mono text-neutral-300">{invoiceName}</span>
            </p>
          )}
          <p className="text-neutral-500 text-sm mt-3">
            Your payment has been processed. A receipt will be sent to you shortly.
          </p>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl px-6 py-4 text-sm text-emerald-300">
          Thank you for choosing AllTec Plumbing.
        </div>

        <p className="text-xs text-neutral-600">
          You can close this window.
        </p>
      </div>
    </div>
  );
}

export default function PaySuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
