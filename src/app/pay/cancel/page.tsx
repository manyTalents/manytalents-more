"use client";

/**
 * /pay/cancel — public cancel page for Stripe Checkout pay-link flow.
 *
 * Stripe redirects here when a customer closes or cancels the Checkout
 * session without completing payment. No server action needed — payment
 * was not captured.
 */

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function CancelContent() {
  const params = useSearchParams();
  const invoiceName = params.get("invoice") ?? "";

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* X icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-neutral-800/60 border-2 border-neutral-600 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-neutral-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Cancelled</h1>
          {invoiceName && (
            <p className="text-neutral-400 text-sm">
              Invoice{" "}
              <span className="font-mono text-neutral-300">{invoiceName}</span>
            </p>
          )}
          <p className="text-neutral-500 text-sm mt-3">
            No charge was made. If you need to complete payment, contact our office.
          </p>
        </div>

        <div className="bg-neutral-800/40 border border-neutral-700/40 rounded-2xl px-6 py-4 text-sm text-neutral-400">
          <p className="font-medium text-neutral-300 mb-1">AllTec Plumbing</p>
          <p>Questions? Call us or ask the technician for another payment link.</p>
        </div>

        <p className="text-xs text-neutral-600">
          You can close this window.
        </p>
      </div>
    </div>
  );
}

export default function PayCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-neutral-600/30 border-t-neutral-400 rounded-full animate-spin" />
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
