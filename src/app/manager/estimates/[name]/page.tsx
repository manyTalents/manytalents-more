"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  getEstimateDetail,
  sendEstimate,
  expireEstimate,
  type EstimateDetail,
  type EstimateOption,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

// ── Constants ──────────────────────────────────────────────

const ESTIMATE_STATUS_BADGE: Record<string, string> = {
  Draft: "bg-neutral-700/60 text-neutral-300",
  Sent: "bg-blue-900/60 text-blue-300",
  Approved: "bg-emerald-900/60 text-emerald-300",
  Declined: "bg-red-900/60 text-red-300",
  Expired: "bg-amber-900/60 text-amber-300",
};

const OPTION_STATUS_BADGE: Record<string, string> = {
  Pending: "bg-neutral-700/60 text-neutral-300",
  Approved: "bg-emerald-900/60 text-emerald-300",
  Declined: "bg-red-900/60 text-red-300",
};

// ── Helpers ────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function StatusBadge({ status, cls }: { status: string; cls: Record<string, string> }) {
  const classes = cls[status] ?? "bg-neutral-700/60 text-neutral-300";
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${classes}`}>
      {status}
    </span>
  );
}

// ── Option Card ────────────────────────────────────────────

function OptionCard({ opt, expanded, onToggle }: {
  opt: EstimateOption;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-navy-surface border border-navy-border rounded-2xl overflow-hidden">
      {/* Header — always visible, click to expand */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-navy-card/30 transition"
      >
        <div className="flex items-center gap-3">
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-navy border border-navy-border text-xs font-bold text-neutral-400">
            {opt.option_index + 1}
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-cream">{opt.name_label}</p>
          </div>
          <StatusBadge status={opt.status || "Pending"} cls={OPTION_STATUS_BADGE} />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-base font-serif font-bold text-gold">{fmtCurrency(opt.total_price)}</p>
          <svg
            className={`w-4 h-4 text-neutral-500 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {/* Expanded line items */}
      {expanded && (
        <div className="border-t border-navy-border px-6 pb-5 pt-4">
          {opt.description && (
            <p className="text-sm text-neutral-400 mb-4">{opt.description}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border">
                  <th className="text-left py-2 pr-4 text-xs font-bold text-cream/50 tracking-wider">DESCRIPTION</th>
                  <th className="text-center py-2 px-3 text-xs font-bold text-cream/50 tracking-wider">QTY</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-cream/50 tracking-wider">RATE</th>
                  <th className="text-right py-2 pl-3 text-xs font-bold text-cream/50 tracking-wider">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {(opt.line_items || []).map((li, idx) => (
                  <tr key={idx} className="border-b border-navy-border/50 last:border-0">
                    <td className="py-2.5 pr-4 text-cream">{li.description}</td>
                    <td className="py-2.5 px-3 text-center text-neutral-400">{li.qty}</td>
                    <td className="py-2.5 px-3 text-right text-neutral-400">{fmtCurrency(li.rate)}</td>
                    <td className="py-2.5 pl-3 text-right font-medium text-cream">{fmtCurrency(li.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-3 pt-3 border-t border-navy-border">
            <div className="text-right">
              <p className="text-xs text-neutral-500">Option Total</p>
              <p className="text-xl font-serif font-bold text-gold">{fmtCurrency(opt.total_price)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function EstimateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const estimateName = decodeURIComponent(params.name as string);

  const [estimate, setEstimate] = useState<EstimateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which option cards are expanded
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  // Action state
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    getEstimateDetail(estimateName)
      .then((data) => {
        setEstimate(data);
        // Expand all options by default
        if (data.options) {
          setExpanded(new Set(data.options.map((_, i) => i)));
        }
      })
      .catch((err: any) => setError(err.message || "Failed to load estimate"))
      .finally(() => setLoading(false));
  }, [estimateName, router]);

  const reload = async () => {
    setLoading(true);
    try {
      const data = await getEstimateDetail(estimateName);
      setEstimate(data);
    } catch {
      // keep what we have
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setActing(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await sendEstimate(estimateName);
      setActionSuccess(
        res.email_sent ? "Estimate sent — customer will receive an email." : "Estimate marked as Sent (email not configured)."
      );
      await reload();
    } catch (err: any) {
      setActionError(err.message || "Could not send estimate");
    } finally {
      setActing(false);
    }
  };

  const handleExpire = async () => {
    if (!confirm("Mark this estimate as Expired?")) return;
    setActing(true);
    setActionError("");
    try {
      await expireEstimate(estimateName);
      await reload();
    } catch (err: any) {
      setActionError(err.message || "Could not expire estimate");
    } finally {
      setActing(false);
    }
  };

  const toggleOption = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !estimate) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-8">
            <p className="text-red-300 mb-4">{error || "Estimate not found"}</p>
            <Link href="/manager/estimates" className="text-gold text-sm hover:text-gold-light transition">
              &larr; Back to Estimates
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const grandTotal = (estimate.options || []).reduce((sum, o) => sum + (o.total_price || 0), 0);
  const approvedTotal = (estimate.options || [])
    .filter((o) => o.status === "Approved")
    .reduce((sum, o) => sum + (o.total_price || 0), 0);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back link */}
        <Link
          href="/manager/estimates"
          className="inline-flex items-center gap-1 text-sm text-cream/50 hover:text-cream transition"
        >
          &larr; Estimates
        </Link>

        {/* Header card */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-serif font-bold text-cream">
                  {estimate.estimate_number || estimate.name}
                </h1>
                <StatusBadge status={estimate.status} cls={ESTIMATE_STATUS_BADGE} />
              </div>
              <div className="mt-3 space-y-1.5">
                <p className="text-sm text-neutral-300">
                  <span className="text-neutral-500">Customer: </span>
                  {estimate.customer_name}
                </p>
                {estimate.address && (
                  <p className="text-sm text-neutral-400">
                    <span className="text-neutral-500">Address: </span>
                    {estimate.address}
                  </p>
                )}
                {estimate.linked_job && (
                  <p className="text-sm">
                    <span className="text-neutral-500">Job: </span>
                    <Link
                      href={`/manager/jobs/${estimate.linked_job}`}
                      className="text-gold hover:text-gold-light transition font-mono text-xs"
                    >
                      {estimate.linked_job_id || estimate.linked_job}
                    </Link>
                  </p>
                )}
                {estimate.sent_at && (
                  <p className="text-xs text-neutral-500">
                    Sent {fmtDate(estimate.sent_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="flex-shrink-0 bg-navy border border-navy-border rounded-xl px-6 py-4 text-right min-w-[160px]">
              <p className="text-xs text-neutral-500 mb-1">Quote Total</p>
              <p className="text-3xl font-serif font-bold text-gold">{fmtCurrency(grandTotal)}</p>
              {approvedTotal > 0 && approvedTotal < grandTotal && (
                <div className="mt-2 pt-2 border-t border-navy-border">
                  <p className="text-xs text-neutral-500">Approved</p>
                  <p className="text-base font-serif font-bold text-emerald-400">{fmtCurrency(approvedTotal)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action bar */}
        {(estimate.status === "Draft" || estimate.status === "Sent") && (
          <div className="bg-navy-surface border border-navy-border rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1">
              {actionSuccess && (
                <p className="text-sm text-emerald-400">{actionSuccess}</p>
              )}
              {actionError && (
                <p className="text-sm text-red-400">{actionError}</p>
              )}
            </div>
            {estimate.status === "Draft" && (
              <button
                onClick={handleSend}
                disabled={acting}
                className="inline-flex items-center gap-2 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-5 py-2.5 rounded-lg text-sm hover:from-gold-light hover:to-gold transition disabled:opacity-60"
              >
                {acting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send to Customer"
                )}
              </button>
            )}
            {estimate.status === "Sent" && (
              <button
                onClick={handleExpire}
                disabled={acting}
                className="inline-flex items-center gap-2 bg-navy border border-amber-900/60 text-amber-400 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-amber-950/20 transition disabled:opacity-60"
              >
                {acting ? "Updating..." : "Mark Expired"}
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        {estimate.notes && (
          <div className="bg-navy-surface border border-navy-border rounded-xl px-5 py-4">
            <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Notes</p>
            <p className="text-sm text-neutral-300">{estimate.notes}</p>
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-neutral-400">
            Pricing Options ({(estimate.options || []).length})
          </p>
          {(estimate.options || []).length === 0 ? (
            <div className="bg-navy-surface border border-navy-border rounded-2xl px-6 py-10 text-center text-neutral-500">
              No options on this estimate.
            </div>
          ) : (
            (estimate.options || []).map((opt, idx) => (
              <OptionCard
                key={opt.name || idx}
                opt={opt}
                expanded={expanded.has(idx)}
                onToggle={() => toggleOption(idx)}
              />
            ))
          )}
        </div>

        {/* Bottom spacer */}
        <div className="pb-8" />
      </main>
    </div>
  );
}
