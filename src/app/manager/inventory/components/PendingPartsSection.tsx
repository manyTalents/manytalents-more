"use client";

import { useEffect, useState } from "react";
import {
  fetchPendingParts,
  approveNewPart,
  rejectNewPart,
  searchPricebook,
  type PricebookRequest,
  type PricebookResult,
} from "@/lib/inventory-api";
import { Spinner } from "./Spinner";
import { fmtDate, fmt$$ } from "./utils";

// ── PendingPartsSection ───────────────────────

interface PendingPartsSectionProps {
  showToast: (msg: string) => void;
}

export function PendingPartsSection({ showToast }: PendingPartsSectionProps) {
  const [pendingParts, setPendingParts] = useState<PricebookRequest[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [rejectingRow, setRejectingRow] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvingRow, setApprovingRow] = useState<string | null>(null);
  const [approveSearch, setApproveSearch] = useState("");
  const [approveResults, setApproveResults] = useState<PricebookResult[]>([]);
  const [approveSearching, setApproveSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoadingPending(true);
    fetchPendingParts(1, 50)
      .then((res) => {
        setPendingParts(res.items || []);
        setPendingTotal(res.total_count);
      })
      .catch((e: unknown) => {
        console.warn("[PendingPartsSection] load error:", e);
        /* non-critical — section silently empty */
      })
      .finally(() => setLoadingPending(false));
  }, []);

  const handleApprove = async (req: PricebookRequest, itemCode?: string) => {
    setActionLoading((s) => ({ ...s, [req.name]: true }));
    try {
      await approveNewPart(req.name, itemCode);
      setPendingParts((prev) => prev.filter((p) => p.name !== req.name));
      setPendingTotal((n) => Math.max(0, n - 1));
      setApprovingRow(null);
      showToast(`Part "${req.part_name}" approved.`);
    } catch (e: unknown) {
      console.warn("[PendingPartsSection] handleApprove error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading((s) => ({ ...s, [req.name]: false }));
    }
  };

  const handleReject = async (req: PricebookRequest) => {
    setActionLoading((s) => ({ ...s, [`rej_${req.name}`]: true }));
    try {
      await rejectNewPart(req.name, rejectReason.trim() || undefined);
      setPendingParts((prev) => prev.filter((p) => p.name !== req.name));
      setPendingTotal((n) => Math.max(0, n - 1));
      setRejectingRow(null);
      setRejectReason("");
      showToast(`Part "${req.part_name}" rejected.`);
    } catch (e: unknown) {
      console.warn("[PendingPartsSection] handleReject error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading((s) => ({ ...s, [`rej_${req.name}`]: false }));
    }
  };

  const handleApproveSearch = async (q: string) => {
    setApproveSearch(q);
    if (!q.trim()) { setApproveResults([]); return; }
    setApproveSearching(true);
    try {
      const res = await searchPricebook(q, 8);
      setApproveResults(res);
    } catch (e: unknown) {
      console.warn("[PendingPartsSection] handleApproveSearch error:", e);
      setApproveResults([]);
    } finally {
      setApproveSearching(false);
    }
  };

  if (loadingPending) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-white font-serif font-bold text-xl">Pending Parts</h2>
        {pendingTotal > 0 && (
          <span className="bg-[#E67E22] text-white text-[11px] font-bold rounded-full min-w-[22px] h-[22px] inline-flex items-center justify-center px-1.5">
            {pendingTotal > 99 ? "99+" : pendingTotal}
          </span>
        )}
      </div>

      {pendingParts.length === 0 ? (
        <p className="text-neutral-500 text-sm italic">No pending part requests.</p>
      ) : (
        <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_100px_80px_120px_120px_160px] gap-0 border-b border-[#1a1f32]">
            {["PART NAME", "TRADE", "SIZE", "SUPPLIER", "SUBMITTED BY", "ACTIONS"].map((h) => (
              <div key={h} className="px-3 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                {h}
              </div>
            ))}
          </div>

          {pendingParts.map((req) => {
            const isApproving = approvingRow === req.name;
            const isRejecting = rejectingRow === req.name;
            const isActionLoading = !!actionLoading[req.name];
            const isRejectLoading = !!actionLoading[`rej_${req.name}`];

            return (
              <div key={req.name} className="border-b border-[#1a1f32] last:border-0">
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[1fr_100px_80px_120px_120px_160px] gap-0 px-0 py-3 items-start">
                  <div className="px-3">
                    <p className="text-sm text-[#f0ebe0] leading-snug">{req.part_name}</p>
                    <p className="text-[10px] text-neutral-600 mt-0.5">{fmtDate(req.creation)}</p>
                  </div>
                  <div className="px-3">
                    <span className="text-xs text-neutral-300">{req.trade || "—"}</span>
                  </div>
                  <div className="px-3">
                    <span className="text-xs text-neutral-400">{req.size || "—"}</span>
                  </div>
                  <div className="px-3">
                    <span className="text-xs text-neutral-300">{req.supplier || "—"}</span>
                  </div>
                  <div className="px-3">
                    <span className="text-xs text-neutral-300">{req.submitted_by || "—"}</span>
                  </div>
                  <div className="px-3 flex items-center gap-1.5">
                    <button
                      onClick={() => { setApprovingRow(isApproving ? null : req.name); setRejectingRow(null); setApproveSearch(""); setApproveResults([]); }}
                      disabled={isActionLoading || isRejectLoading}
                      className="min-h-[30px] px-2.5 py-1 bg-[#1a1f32] border border-[#28a745]/30 text-[#28a745] hover:bg-[#28a745]/10 rounded-lg text-[11px] font-bold transition disabled:opacity-40"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => { setRejectingRow(isRejecting ? null : req.name); setApprovingRow(null); setRejectReason(""); }}
                      disabled={isActionLoading || isRejectLoading}
                      className="min-h-[30px] px-2.5 py-1 bg-[#1a1f32] border border-[#dc3545]/30 text-[#dc3545] hover:bg-[#dc3545]/10 rounded-lg text-[11px] font-bold transition disabled:opacity-40"
                    >
                      {isRejectLoading ? <Spinner size="sm" /> : "REJECT"}
                    </button>
                  </div>
                </div>

                {/* Mobile */}
                <div className="md:hidden px-4 py-4">
                  <p className="text-sm text-[#f0ebe0] font-semibold">{req.part_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-neutral-500">
                    {req.trade && <span>{req.trade}</span>}
                    {req.size && <span>{req.size}</span>}
                    {req.supplier && <span>{req.supplier}</span>}
                    <span>{fmtDate(req.creation)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setApprovingRow(isApproving ? null : req.name); setRejectingRow(null); setApproveSearch(""); setApproveResults([]); }}
                      disabled={isActionLoading || isRejectLoading}
                      className="flex-1 min-h-[34px] bg-[#1a1f32] border border-[#28a745]/30 text-[#28a745] rounded-lg text-xs font-bold transition disabled:opacity-40"
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => { setRejectingRow(isRejecting ? null : req.name); setApprovingRow(null); setRejectReason(""); }}
                      disabled={isActionLoading || isRejectLoading}
                      className="flex-1 min-h-[34px] bg-[#1a1f32] border border-[#dc3545]/30 text-[#dc3545] rounded-lg text-xs font-bold transition disabled:opacity-40"
                    >
                      {isRejectLoading ? <Spinner size="sm" /> : "REJECT"}
                    </button>
                  </div>
                </div>

                {/* Approve panel */}
                {isApproving && (
                  <div className="px-4 pb-4 bg-[#111627] border-t border-[#1a1f32]">
                    <p className="text-xs text-neutral-400 mt-3 mb-2">
                      Optionally link to an existing pricebook item, or approve as new:
                    </p>
                    <div className="relative mb-3">
                      <input
                        type="text"
                        value={approveSearch}
                        onChange={(e) => handleApproveSearch(e.target.value)}
                        className="w-full bg-[#0d1120] border border-[#1a1f32] rounded-lg px-3 py-2 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c]/60 transition pr-8"
                        placeholder="Search pricebook (optional)..."
                      />
                      {approveSearching && (
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                          <Spinner size="sm" />
                        </div>
                      )}
                    </div>
                    {approveResults.length > 0 && (
                      <div className="bg-[#0d1120] border border-[#1a1f32] rounded-lg overflow-hidden mb-3">
                        {approveResults.map((r) => (
                          <button
                            key={r.name}
                            onClick={() => handleApprove(req, r.name)}
                            disabled={isActionLoading}
                            className="block w-full text-left px-3 py-2.5 text-xs text-neutral-300 hover:bg-[#1a1f32] hover:text-[#c9a84c] transition border-b border-[#1a1f32] last:border-0"
                          >
                            <span className="font-mono text-[#c9a84c] mr-2">{r.name}</span>
                            {r.item_name}
                            {r.standard_rate > 0 && (
                              <span className="ml-2 text-neutral-500">{fmt$$(r.standard_rate)}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={isActionLoading}
                        className="px-4 py-2 bg-[#28a745] hover:bg-[#1e7e34] text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isActionLoading ? <Spinner size="sm" /> : null}
                        Approve as New Part
                      </button>
                      <button
                        onClick={() => setApprovingRow(null)}
                        className="px-4 py-2 bg-[#1a1f32] text-neutral-400 hover:text-white rounded-lg text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject panel */}
                {isRejecting && (
                  <div className="px-4 pb-4 bg-[#111627] border-t border-[#1a1f32]">
                    <p className="text-xs text-neutral-400 mt-3 mb-2">Rejection reason (optional):</p>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleReject(req); }}
                      className="w-full bg-[#0d1120] border border-[#1a1f32] rounded-lg px-3 py-2 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#dc3545]/60 transition mb-3"
                      placeholder="e.g. Duplicate of existing item"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(req)}
                        disabled={isRejectLoading}
                        className="px-4 py-2 bg-[#dc3545] hover:bg-[#c82333] text-white rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isRejectLoading ? <Spinner size="sm" /> : null}
                        Confirm Reject
                      </button>
                      <button
                        onClick={() => setRejectingRow(null)}
                        className="px-4 py-2 bg-[#1a1f32] text-neutral-400 hover:text-white rounded-lg text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
