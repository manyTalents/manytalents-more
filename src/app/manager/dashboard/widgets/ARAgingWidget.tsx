"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WidgetShell from "./WidgetShell";
import { getARAging, type ARBucket } from "@/lib/frappe";

const BUCKET_KEYS = ["0-30", "31-60", "61-90", "91+"] as const;

function bucketStyle(label: string): {
  card: string;
  badge: boolean;
} {
  switch (label) {
    case "0-30":
      return { card: "border border-navy-border", badge: false };
    case "31-60":
    case "61-90":
      return { card: "border border-red-500", badge: false };
    case "91+":
      return { card: "border border-red-900 bg-red-900/10", badge: true };
    default:
      return { card: "border border-navy-border", badge: false };
  }
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ARAgingWidget() {
  const router = useRouter();
  const [buckets, setBuckets] = useState<ARBucket[]>([]);
  const [summary, setSummary] = useState<{ total_outstanding: number; total_count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getARAging()
      .then((data) => {
        setBuckets(data.buckets);
        setSummary(data.summary);
      })
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  function handleBucketClick(label: string) {
    const key = label.replace("+", "plus");
    router.push(`/manager/invoices?bucket=${key}`);
  }

  return (
    <WidgetShell title="A/R Aging" loading={loading}>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <div className="space-y-4">
          {/* Summary bar */}
          {summary && (
            <div className="flex items-baseline gap-2">
              <span className="text-gold font-bold text-xl">{fmt(summary.total_outstanding)}</span>
              <span className="text-cream/50 text-sm">
                {summary.total_count} invoice{summary.total_count !== 1 ? "s" : ""} outstanding
              </span>
            </div>
          )}

          {/* Bucket cards */}
          <div className="grid grid-cols-2 gap-3">
            {buckets.map((bucket) => {
              const { card, badge } = bucketStyle(bucket.label);
              return (
                <button
                  key={bucket.label}
                  onClick={() => handleBucketClick(bucket.label)}
                  className={`${card} rounded-lg p-3 text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold`}
                  aria-label={`${bucket.label} days bucket: ${bucket.count} invoices totalling ${fmt(bucket.total)}`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="text-xs font-bold text-cream/60 tracking-wider uppercase">
                      {bucket.label} days
                    </span>
                    {badge && (
                      <span className="text-[10px] font-black tracking-widest text-red-400 uppercase border border-red-700 rounded px-1 py-0.5 leading-none">
                        Collections
                      </span>
                    )}
                  </div>
                  <p className="text-cream font-bold text-lg leading-tight">{fmt(bucket.total)}</p>
                  <p className="text-cream/40 text-xs mt-0.5">
                    {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </WidgetShell>
  );
}
