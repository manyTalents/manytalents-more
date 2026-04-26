"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  getPlanDetail,
  sendPlan,
  generateWorkOrder,
  callMethod,
  type PlanDetail,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

// ── Constants ──────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  Draft: "bg-neutral-700/60 text-neutral-300",
  Sent: "bg-blue-900/60 text-blue-300",
  Active: "bg-emerald-900/60 text-emerald-300",
  Cancelled: "bg-red-900/60 text-red-300",
};

// ── Helpers ────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-neutral-700/60 text-neutral-300";
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

function CheckIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-neutral-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
    </svg>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function ServicePlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planName = decodeURIComponent(params.name as string);

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action state
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [workOrderResult, setWorkOrderResult] = useState<{ job_name: string; hcp_job_id: string } | null>(null);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    loadPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planName, router]);

  const loadPlan = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPlanDetail(planName);
      setPlan(data);
    } catch (err: any) {
      setError(err.message || "Failed to load plan");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setActing(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await sendPlan(planName);
      setActionSuccess(
        res.email_sent
          ? "Plan sent — customer will receive an email link to approve."
          : "Plan marked as Sent (email not configured)."
      );
      await loadPlan();
    } catch (err: any) {
      setActionError(err.message || "Could not send plan");
    } finally {
      setActing(false);
    }
  };

  const handleGenerateWorkOrder = async () => {
    setActing(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await generateWorkOrder(planName);
      setWorkOrderResult(res);
      setActionSuccess(`Work order created: ${res.hcp_job_id}`);
    } catch (err: any) {
      setActionError(err.message || "Could not generate work order");
    } finally {
      setActing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this service plan? This cannot be undone.")) return;
    setActing(true);
    setActionError("");
    try {
      await callMethod("hcp_replacement.hcp_replacement.api.service_plans.cancel_plan", {
        plan_name: planName,
      });
      await loadPlan();
    } catch (err: any) {
      setActionError(err.message || "Could not cancel plan");
    } finally {
      setActing(false);
    }
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
  if (error || !plan) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-8">
            <p className="text-red-300 mb-4">{error || "Plan not found"}</p>
            <Link href="/manager/service-plans" className="text-gold text-sm hover:text-gold-light transition">
              &larr; Back to Service Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = plan.status === "Cancelled";

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back link */}
        <Link
          href="/manager/service-plans"
          className="inline-flex items-center gap-1 text-sm text-cream/50 hover:text-cream transition"
        >
          &larr; Service Plans
        </Link>

        {/* Header card */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-serif font-bold text-cream">
                  {plan.template_name || plan.template}
                </h1>
                <StatusBadge status={plan.status} />
              </div>
              <div className="mt-3 space-y-1.5">
                <p className="text-sm text-neutral-300">
                  <span className="text-neutral-500">Customer: </span>
                  {plan.customer_name}
                </p>
                {plan.address && (
                  <p className="text-sm text-neutral-400">
                    <span className="text-neutral-500">Address: </span>
                    {plan.address}
                  </p>
                )}
                {plan.trade && (
                  <p className="text-sm text-neutral-400">
                    <span className="text-neutral-500">Trade: </span>
                    {plan.trade}
                  </p>
                )}
                {plan.approved_at && (
                  <p className="text-xs text-neutral-500">
                    Approved {fmtDate(plan.approved_at)}
                  </p>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="flex-shrink-0 bg-navy border border-navy-border rounded-xl px-6 py-4 text-right min-w-[150px]">
              <p className="text-xs text-neutral-500 mb-1">Annual Price</p>
              <p className="text-3xl font-serif font-bold text-gold">{fmtCurrency(plan.price)}</p>
            </div>
          </div>
        </div>

        {/* Service Schedule */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-4">
            Service Schedule
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Next Service</p>
              <p className="text-sm font-semibold text-cream">{fmtDate(plan.next_service_date)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Last Service</p>
              <p className="text-sm font-semibold text-cream">{fmtDate(plan.last_service_date)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Interval</p>
              <p className="text-sm font-semibold text-cream">
                Every {plan.service_interval_months} month{plan.service_interval_months !== 1 ? "s" : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Visits / Year</p>
              <p className="text-sm font-semibold text-cream">{plan.visits_per_year}</p>
            </div>
          </div>
        </div>

        {/* Checklist */}
        {plan.checklist && plan.checklist.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <h2 className="text-xs uppercase tracking-wider font-semibold text-neutral-400 mb-4">
              Covered Services ({plan.checklist.length})
            </h2>
            <ul className="space-y-2.5">
              {plan.checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckIcon filled={true} />
                  <span className="text-sm text-cream leading-snug">{item.item_text}</span>
                  {item.required ? (
                    <span className="text-xs text-neutral-500 ml-auto flex-shrink-0">required</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action bar */}
        {!isCancelled && (
          <div className="bg-navy-surface border border-navy-border rounded-xl px-5 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
              {/* Feedback messages */}
              <div className="flex-1 min-w-0">
                {actionSuccess && (
                  <p className="text-sm text-emerald-400">{actionSuccess}</p>
                )}
                {actionError && (
                  <p className="text-sm text-red-400">{actionError}</p>
                )}
                {workOrderResult && (
                  <Link
                    href={`/manager/jobs/${encodeURIComponent(workOrderResult.job_name)}`}
                    className="text-sm text-gold hover:text-gold-light transition"
                  >
                    View Job {workOrderResult.hcp_job_id} &rarr;
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Draft → Send */}
                {plan.status === "Draft" && (
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

                {/* Active → Generate Work Order */}
                {plan.status === "Active" && (
                  <button
                    onClick={handleGenerateWorkOrder}
                    disabled={acting}
                    className="inline-flex items-center gap-2 bg-emerald-800/50 border border-emerald-700/60 text-emerald-300 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-emerald-800/80 transition disabled:opacity-60"
                  >
                    {acting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Generate Work Order"
                    )}
                  </button>
                )}

                {/* Cancel — only for Active or Sent plans */}
                {["Active", "Sent"].includes(plan.status) && (
                  <button
                    onClick={handleCancel}
                    disabled={acting}
                    className="inline-flex items-center gap-2 bg-navy border border-red-900/50 text-red-400 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-red-950/20 transition disabled:opacity-60"
                  >
                    Cancel Plan
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl px-5 py-4 text-sm text-red-400 text-center">
            This service plan has been cancelled.
          </div>
        )}

        <div className="pb-8" />
      </main>
    </div>
  );
}
