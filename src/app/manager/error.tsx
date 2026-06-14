"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ManagerError({ error, reset }: ErrorPageProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    console.warn("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-navy-surface border border-navy-border flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c9a84c"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-serif text-2xl font-bold text-cream text-center mb-2">
          Something went wrong
        </h1>
        <p className="text-neutral-400 text-sm text-center mb-8 leading-relaxed">
          An unexpected error occurred in this section of the app. Your data
          is safe — this is a display issue only.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <button
            onClick={reset}
            className="bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-6 py-2.5 rounded-lg text-sm hover:from-gold-light hover:to-gold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            Try Again
          </button>
          <Link
            href="/manager/jobs"
            className="border border-navy-border text-cream px-6 py-2.5 rounded-lg text-sm font-medium hover:border-gold-dark hover:text-gold transition text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
          >
            Return to Dashboard
          </Link>
        </div>

        {/* Collapsible details */}
        <div className="border border-navy-border rounded-xl overflow-hidden">
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            aria-expanded={detailsOpen}
            className="w-full flex items-center justify-between px-4 py-3 bg-navy-surface text-left text-sm text-neutral-400 hover:text-cream transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <span className="font-medium">Details</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {detailsOpen && (
            <div className="px-4 py-3 bg-navy border-t border-navy-border">
              <p className="text-xs font-mono text-red-400 break-all leading-relaxed">
                {error.message || "Unknown error"}
              </p>
              {error.digest && (
                <p className="mt-2 text-xs font-mono text-neutral-600">
                  Digest: {error.digest}
                </p>
              )}
              {error.stack && (
                <pre className="mt-3 text-xs font-mono text-neutral-600 whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
