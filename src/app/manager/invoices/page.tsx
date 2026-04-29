"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth, getARAging, resendInvoice, type ARBucket, type ARInvoice } from "@/lib/frappe";
import { getFeatureFlags } from "@/lib/features";
import NavBar from "@/app/manager/components/NavBar";

const BUCKET_LABELS = ["0-30", "31-60", "61-90", "91+"];

function InvoicesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBucket = searchParams.get("bucket")?.replace("plus", "+") || "all";

  const [buckets, setBuckets] = useState<ARBucket[]>([]);
  const [filter, setFilter] = useState(initialBucket);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.push("/manager"); return; }
    if (!getFeatureFlags().invoicing) { router.replace("/manager/dashboard"); return; }
    getARAging()
      .then((res) => setBuckets(res.buckets))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const allInvoices = filter === "all"
    ? buckets.flatMap((b) => b.invoices)
    : buckets.find((b) => b.label === filter)?.invoices || [];

  const handleResend = async (invoiceName: string) => {
    setResending(invoiceName);
    try {
      await resendInvoice(invoiceName);
      const fresh = await getARAging();
      setBuckets(fresh.buckets);
    } catch {
      setError("Resend failed. Please try again.");
    }
    setResending(null);
  };

  function colourBadge(colour: string) {
    if (colour === "darkred") return "bg-red-900/30 text-red-400";
    if (colour === "red") return "bg-red-500/20 text-red-400";
    if (colour === "orange") return "bg-orange-500/20 text-orange-400";
    return "bg-cream/10 text-cream/50";
  }

  function statusLabel(colour: string) {
    if (colour === "darkred") return "COLLECTIONS";
    if (colour === "orange") return "RESENT";
    if (colour === "red") return "OVERDUE";
    return "SENT";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-cream">Invoices</h1>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-300 hover:text-red-100 ml-4 text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            filter === "all" ? "bg-gold text-navy" : "bg-navy-card text-cream/60 hover:text-cream"
          }`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        {BUCKET_LABELS.map((label) => {
          const bucket = buckets.find((b) => b.label === label);
          return (
            <button
              key={label}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === label ? "bg-gold text-navy" : "bg-navy-card text-cream/60 hover:text-cream"
              }`}
              onClick={() => setFilter(label)}
            >
              {label} ({bucket?.count || 0})
            </button>
          );
        })}
      </div>

      {/* Invoice table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="bg-navy-surface rounded-xl border border-navy-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-border">
                <th className="text-left px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">INVOICE</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">CUSTOMER</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">AMOUNT</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">DAYS</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">STATUS</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {allInvoices.map((inv) => (
                <tr key={inv.name} className="border-b border-navy-border/50 hover:bg-navy-card/50 transition">
                  <td className="px-4 py-3 text-sm text-cream font-mono">{inv.name}</td>
                  <td className="px-4 py-3 text-sm text-cream">{inv.customer}</td>
                  <td className="px-4 py-3 text-sm text-cream text-right font-medium">${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-cream/60">{inv.days}d</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${colourBadge(inv.colour)}`}>
                      {statusLabel(inv.colour)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.days > 30 && (
                      <button
                        onClick={() => handleResend(inv.name)}
                        disabled={resending === inv.name}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition disabled:opacity-50"
                      >
                        {resending === inv.name ? "..." : "RESEND"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {allInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-cream/40">
                    No invoices in this bucket
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <div className="min-h-screen">
      <NavBar />
      <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>}>
        <InvoicesInner />
      </Suspense>
    </div>
  );
}
