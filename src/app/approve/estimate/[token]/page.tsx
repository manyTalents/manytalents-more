"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { approveEstimateOption, type EstimateDetail, type EstimateOption } from "@/lib/frappe";

// ── Types ──────────────────────────────────────────────────

interface PublicEstimate {
  estimate_number: string;
  customer_name: string;
  address: string;
  status: string;
  approval_mode: string;
  options: EstimateOption[];
}

// ── Helpers ────────────────────────────────────────────────

const SITE = process.env.NEXT_PUBLIC_FRAPPE_SITE || "https://manytalentsmore.v.frappe.cloud";

async function loadPublicEstimate(token: string): Promise<PublicEstimate> {
  const res = await fetch(`${SITE.replace(/\/+$/, "")}/api/method/hcp_replacement.hcp_replacement.api.estimates.get_estimate_by_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ token }),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Unexpected response from server");
  }
  if (!res.ok) {
    const msg =
      json?._server_messages
        ? (() => { try { const m = JSON.parse(json._server_messages); const f = typeof m[0] === "string" ? JSON.parse(m[0]) : m[0]; return f?.message || ""; } catch { return ""; } })()
        : "";
    throw new Error(msg || json?.exception || `Error ${res.status}`);
  }
  return json.message as PublicEstimate;
}

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Option Card (light theme) ─────────────────────────────

type OptionOutcome = "approved" | "declined" | null;

function OptionCard({
  opt,
  outcome,
  onApprove,
  onDecline,
  acting,
  isMulti,
  anyApproved,
}: {
  opt: EstimateOption;
  outcome: OptionOutcome;
  onApprove: () => void;
  onDecline: () => void;
  acting: boolean;
  isMulti: boolean;
  anyApproved: boolean;
}) {
  const alreadyActioned = opt.status === "Approved" || opt.status === "Declined";
  const displayStatus = outcome ?? (alreadyActioned ? opt.status.toLowerCase() as OptionOutcome : null);

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm transition ${
      displayStatus === "approved"
        ? "border-emerald-300"
        : displayStatus === "declined"
        ? "border-gray-200"
        : "border-gray-200 hover:border-gray-300"
    }`}>
      {/* Card header */}
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{opt.name_label}</h3>
          {opt.description && (
            <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-gray-900">{fmtCurrency(opt.total_price)}</p>
          {opt.financing_available ? (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Financing available</p>
          ) : null}
        </div>
      </div>

      {/* Line items */}
      <div className="px-6 pb-4 border-t border-gray-100">
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Item</th>
              <th className="text-center pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Qty</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rate</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(opt.line_items || []).map((li, idx) => (
              <tr key={idx} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-3 text-gray-700">{li.description}</td>
                <td className="py-2 px-2 text-center text-gray-500">{li.qty}</td>
                <td className="py-2 px-2 text-right text-gray-500">{fmtCurrency(li.rate)}</td>
                <td className="py-2 pl-2 text-right font-medium text-gray-800">{fmtCurrency(li.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status / Actions */}
      <div className="px-6 pb-6">
        {displayStatus === "approved" ? (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-semibold text-emerald-700">Approved</p>
          </div>
        ) : displayStatus === "declined" ? (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-semibold text-gray-500">Declined</p>
          </div>
        ) : (
          // Action buttons — hidden if single mode and one option was already approved
          (!isMulti && anyApproved) ? (
            <p className="text-xs text-gray-400 text-center py-2">
              Another option has been selected.
            </p>
          ) : (
            <div className="flex gap-3 pt-2">
              <button
                onClick={onApprove}
                disabled={acting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60"
              >
                {acting ? "Processing..." : "Approve"}
              </button>
              <button
                onClick={onDecline}
                disabled={acting}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Inner (needs useParams) ───────────────────────────────

function EstimateApprovalInner() {
  const params = useParams();
  const token = params.token as string;

  const [estimate, setEstimate] = useState<PublicEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Per-option outcome tracking (local optimistic)
  const [outcomes, setOutcomes] = useState<Record<number, OptionOutcome>>({});
  const [acting, setActing] = useState<Record<number, boolean>>({});
  const [actionErrors, setActionErrors] = useState<Record<number, string>>({});

  // Global result
  const [globalDone, setGlobalDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadPublicEstimate(token)
      .then((data) => {
        setEstimate(data);
        // Pre-populate from existing statuses
        const init: Record<number, OptionOutcome> = {};
        data.options.forEach((opt) => {
          if (opt.status === "Approved") init[opt.option_index] = "approved";
          else if (opt.status === "Declined") init[opt.option_index] = "declined";
        });
        setOutcomes(init);
        // If estimate-level status already actioned, mark done
        if (["Approved", "Declined", "Expired"].includes(data.status)) {
          setGlobalDone(true);
        }
      })
      .catch((err) => setLoadError(err.message || "Could not load this estimate."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (optIdx: number, action: "approve" | "decline") => {
    setActing((prev) => ({ ...prev, [optIdx]: true }));
    setActionErrors((prev) => ({ ...prev, [optIdx]: "" }));
    try {
      const res = await approveEstimateOption(token, optIdx, action);
      const newOutcome: OptionOutcome = action === "approve" ? "approved" : "declined";
      setOutcomes((prev) => ({ ...prev, [optIdx]: newOutcome }));
      // If estimate is now fully resolved, show global done
      if (["Approved", "Declined"].includes(res.estimate_status)) {
        setGlobalDone(true);
      }
    } catch (err: any) {
      setActionErrors((prev) => ({ ...prev, [optIdx]: err.message || "Could not process your selection" }));
    } finally {
      setActing((prev) => ({ ...prev, [optIdx]: false }));
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" aria-busy={true}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your estimate...</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Cannot Load Estimate</h2>
          <p className="text-sm text-gray-500">{loadError}</p>
          <p className="text-xs text-gray-400 mt-4">
            This link may have expired or be invalid. Please contact us for assistance.
          </p>
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  const isMulti = estimate.approval_mode?.toLowerCase().includes("multiple");
  const anyApproved = Object.values(outcomes).some((o) => o === "approved");
  const allOptions = estimate.options || [];

  // ── Already expired / fully resolved before any interaction ──
  if (estimate.status === "Expired") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Estimate Expired</h2>
          <p className="text-sm text-gray-500">
            This estimate is no longer active. Please contact us to request an updated quote.
          </p>
        </div>
      </div>
    );
  }

  // ── Global done screen (shown after action completes the estimate) ──
  if (globalDone && estimate.status !== "Sent" && estimate.status !== "Draft") {
    const totalApproved = allOptions
      .filter((_, i) => outcomes[i] === "approved" || allOptions[i]?.status === "Approved")
      .reduce((sum, o) => sum + (o.total_price || 0), 0);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h2>
          {totalApproved > 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-1">Your selections have been recorded.</p>
              <p className="text-2xl font-bold text-gray-900 my-3">{fmtCurrency(totalApproved)}</p>
              <p className="text-sm text-gray-500">
                Our team will be in touch shortly to schedule the work.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Your response has been recorded. Thank you for letting us know.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Main approval page ──
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Brand header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">AllTec Plumbing, Electrical &amp; HVAC LLC</h1>
            <p className="text-xs text-gray-500">Professional Home Services</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Estimate</p>
            <p className="text-sm font-mono font-bold text-gray-700">{estimate.estimate_number || "—"}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5">
          <p className="text-xs uppercase tracking-wide font-semibold text-gray-400 mb-2">
            Prepared For
          </p>
          <p className="text-lg font-semibold text-gray-900">{estimate.customer_name}</p>
          {estimate.address && (
            <p className="text-sm text-gray-500 mt-0.5">{estimate.address}</p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
          <p className="text-sm text-blue-800 font-medium">
            {isMulti
              ? "Review each option below and approve or decline individually."
              : "Review the options below and select the one that works best for you."}
          </p>
        </div>

        {/* Options */}
        {allOptions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-10 text-center text-gray-400">
            No options on this estimate.
          </div>
        ) : (
          allOptions.map((opt) => {
            const idx = opt.option_index;
            return (
              <div key={opt.name || idx}>
                <OptionCard
                  opt={opt}
                  outcome={outcomes[idx] ?? null}
                  onApprove={() => handleAction(idx, "approve")}
                  onDecline={() => handleAction(idx, "decline")}
                  acting={!!acting[idx]}
                  isMulti={isMulti}
                  anyApproved={anyApproved}
                />
                {actionErrors[idx] && (
                  <p className="text-xs text-red-500 mt-2 px-1">{actionErrors[idx]}</p>
                )}
              </div>
            );
          })
        )}

        {/* Footer */}
        <div className="text-center pt-4 pb-10">
          <p className="text-xs text-gray-400">
            Questions? Call (318) 245-9810 or reply to the email you received.
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Page wrapper ───────────────────────────────────────────

export default function EstimateApprovalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <EstimateApprovalInner />
    </Suspense>
  );
}
