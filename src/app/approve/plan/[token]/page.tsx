"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { approvePlan, declinePlan, getPlanByToken } from "@/lib/frappe";

// ── Types ──────────────────────────────────────────────────

interface PublicPlan {
  name: string;
  template_name: string;
  customer_name: string;
  address: string;
  status: string;
  price: number;
  billing_cadence: string;
  service_interval_months: number;
  visits_per_year: number;
  checklist: { item_text: string; required: number }[];
  trade: string;
}

// ── Helpers ────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Check icon ─────────────────────────────────────────────

function CheckCircle() {
  return (
    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
}

// ── Inner (needs useParams) ────────────────────────────────

function PlanApprovalInner() {
  const params = useParams();
  const token = params.token as string;

  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [outcome, setOutcome] = useState<"approved" | "declined" | null>(null);
  const [acting, setActing] = useState(false);
  const [actingAction, setActingAction] = useState<"approve" | "decline" | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!token) return;
    getPlanByToken(token)
      .then((data: PublicPlan) => {
        setPlan(data);
        // Pre-populate if already actioned
        if (data.status === "Active") setOutcome("approved");
        else if (data.status === "Cancelled") setOutcome("declined");
      })
      .catch((err: any) => setLoadError(err.message || "Could not load this plan."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async () => {
    setActing(true);
    setActingAction("approve");
    setActionError("");
    try {
      await approvePlan(token);
      setOutcome("approved");
    } catch (err: any) {
      setActionError(err.message || "Could not process your approval.");
    } finally {
      setActing(false);
      setActingAction(null);
    }
  };

  const handleDecline = async () => {
    setActing(true);
    setActingAction("decline");
    setActionError("");
    try {
      await declinePlan(token);
      setOutcome("declined");
    } catch (err: any) {
      setActionError(err.message || "Could not process your response.");
    } finally {
      setActing(false);
      setActingAction(null);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your plan...</p>
        </div>
      </div>
    );
  }

  // ── Load error ──
  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cannot Load Plan</h2>
          <p className="text-sm text-gray-500">{loadError}</p>
          <p className="text-xs text-gray-400 mt-4">
            This link may have expired or be invalid. Please contact us for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  // ── Already expired / cancelled before any interaction ──
  if (plan.status === "Cancelled" && !outcome) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Plan No Longer Available</h2>
          <p className="text-sm text-gray-500">
            This service plan has been cancelled. Please contact us if you have questions.
          </p>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (outcome === "approved") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Plan Approved</h2>
          <p className="text-sm text-gray-600 mb-3">
            Thank you, {plan.customer_name}. Your {plan.template_name} service plan is now active.
          </p>
          <p className="text-2xl font-bold text-gray-900 my-3">{fmtCurrency(plan.price)}/yr</p>
          <p className="text-sm text-gray-500">
            Our team will contact you to schedule your first visit. You will receive service{" "}
            every {plan.service_interval_months} month{plan.service_interval_months !== 1 ? "s" : ""}.
          </p>
        </div>
      </div>
    );
  }

  // ── Decline confirmation screen ──
  if (outcome === "declined") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Response Recorded</h2>
          <p className="text-sm text-gray-500">
            Thank you for letting us know. We have noted your response. Feel free to reach out if
            you change your mind or have any questions.
          </p>
        </div>
      </div>
    );
  }

  // ── Main approval page ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Brand header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">AllTec Plumbing, Electrical &amp; HVAC</h1>
            <p className="text-xs text-gray-500">Professional Home Services</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Service Plan</p>
            <p className="text-sm font-semibold text-gray-700">{plan.template_name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-400 mb-2">
            Prepared For
          </p>
          <p className="text-lg font-semibold text-gray-900">{plan.customer_name}</p>
          {plan.address && (
            <p className="text-sm text-gray-500 mt-0.5">{plan.address}</p>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold text-gray-400 mb-1">
                Annual Investment
              </p>
              <p className="text-3xl font-bold text-gray-900">{fmtCurrency(plan.price)}</p>
              <p className="text-sm text-gray-500 mt-1 capitalize">
                Billed {plan.billing_cadence} &middot; {plan.visits_per_year} visit{plan.visits_per_year !== 1 ? "s" : ""} per year
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Trade</p>
              <p className="text-sm font-semibold text-gray-700">{plan.trade}</p>
            </div>
          </div>
        </div>

        {/* Covered services checklist */}
        {plan.checklist && plan.checklist.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
            <p className="text-xs uppercase tracking-wide font-semibold text-gray-400 mb-4">
              What&apos;s Covered
            </p>
            <ul className="space-y-2.5">
              {plan.checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle />
                  <span className="text-sm text-gray-700 leading-snug">{item.item_text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Schedule info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <p className="text-sm text-blue-800 font-medium">
            Service visits every {plan.service_interval_months} month{plan.service_interval_months !== 1 ? "s" : ""}.
            Our team will contact you to schedule each visit in advance.
          </p>
        </div>

        {/* Action error */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 text-sm text-red-700">
            {actionError}
          </div>
        )}

        {/* Action buttons */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-6">
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">
            <label htmlFor="auth-acknowledge">
              By approving this plan, you authorize recurring service visits and billing as described
              above. You may cancel at any time by contacting our office.
            </label>
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleApprove}
              disabled={acting}
              aria-label="Approve service plan"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {acting && actingAction === "approve" ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Approve Plan"
              )}
            </button>
            <button
              onClick={handleDecline}
              disabled={acting}
              aria-label="Decline service plan"
              className="flex-1 sm:flex-none sm:px-8 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {acting && actingAction === "decline" ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                "Decline"
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-10">
          <p className="text-xs text-gray-400">
            Questions? Call us or reply to the email you received.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Page wrapper ───────────────────────────────────────────

export default function PlanApprovalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <PlanApprovalInner />
    </Suspense>
  );
}
