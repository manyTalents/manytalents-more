"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchAllReceipts,
  type ReceiptRow,
} from "@/lib/inventory-api";
import { ReceiptThumbnail } from "@/app/manager/inventory/ReceiptImageViewer";
import { Spinner } from "./Spinner";
import { DispatchView } from "./DispatchView";
import { fmt$$, fmtDate, initials, STATUS_DOT, STATUS_TEXT, PAGE_SIZE } from "./utils";
import type { StatusFilter } from "./utils";

// ── ReceiptsTab ───────────────────────────────

export function ReceiptsTab() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [error, setError] = useState("");
  const [dispatchingReceipt, setDispatchingReceipt] = useState<string | null>(null);

  // Browser back button support
  const openDispatch = useCallback((name: string) => {
    setDispatchingReceipt(name);
    window.history.pushState({ view: "dispatch", receipt: name }, "");
  }, []);

  const closeDispatch = useCallback(() => {
    setDispatchingReceipt(null);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setDispatchingReceipt(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const load = useCallback(async (pg: number, filter: StatusFilter, replace: boolean) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetchAllReceipts(pg, PAGE_SIZE, filter);
      setReceipts((prev) => replace ? res.receipts : [...prev, ...res.receipts]);
      setHasMore(res.has_more);
      setPage(pg);
    } catch (e: unknown) {
      console.warn("[ReceiptsTab] load error:", e);
      setError(e instanceof Error ? e.message : "Failed to load receipts.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setReceipts([]);
    load(1, statusFilter, true);
  }, [statusFilter, load]);

  if (dispatchingReceipt) {
    return (
      <DispatchView
        receiptName={dispatchingReceipt}
        onBack={closeDispatch}
      />
    );
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {(["", "Pending", "Complete", "Failed"] as StatusFilter[]).map((f) => (
          <button
            key={f || "all"}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
              statusFilter === f
                ? "bg-[#c9a84c] text-[#080c18]"
                : "bg-[#0d1120] border border-[#1a1f32] text-neutral-400 hover:text-white"
            }`}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <p className="text-[#dc3545] text-sm mb-4">{error}</p>}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      )}

      {/* Empty */}
      {!loading && receipts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <svg className="w-10 h-10 text-neutral-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-neutral-400 text-sm">No receipts found</p>
        </div>
      )}

      {/* Receipt rows */}
      {!loading && receipts.length > 0 && (
        <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
          {receipts.map((r, idx) => (
            <div
              key={r.name}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-[#111627] transition ${
                idx < receipts.length - 1 ? "border-b border-[#1a1f32]" : ""
              }`}
            >
              {/* Status dot */}
              <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[r.status] || "bg-neutral-600"}`} />

              {/* Supplier + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-semibold text-white text-sm">{r.supplier || "Unknown Supplier"}</span>
                  {r.hcp_job_id && (
                    <span className="text-xs text-[#c9a84c] font-mono">#{r.hcp_job_id}</span>
                  )}
                  {r.status && (
                    <span className={`text-xs font-semibold ${STATUS_TEXT[r.status] || "text-neutral-400"}`}>
                      {r.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[11px] text-neutral-500 flex-wrap">
                  {r.buyer_name && (
                    <span className="flex items-center gap-1">
                      <span className="h-4 w-4 rounded-full bg-[#1a1f32] text-[9px] font-bold text-[#c9a84c] inline-flex items-center justify-center">
                        {initials(r.buyer_name)}
                      </span>
                      {r.buyer_name}
                    </span>
                  )}
                  <span>{fmtDate(r.receipt_date)}</span>
                  {r.item_count > 0 && <span>{r.item_count} item{r.item_count !== 1 ? "s" : ""}</span>}
                </div>
              </div>

              {/* Total */}
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-[#c9a84c] font-mono">{fmt$$(r.parsed_total || 0)}</p>
              </div>

              {/* Receipt thumbnail */}
              <ReceiptThumbnail
                receiptFile={r.receipt_file}
                items={[]}
                supplier={r.supplier}
                receiptName={r.name}
              />

              {/* Dispatch button */}
              <button
                onClick={() => openDispatch(r.name)}
                className="flex-shrink-0 min-h-[36px] px-4 py-2 bg-gradient-to-br from-[#c9a84c] to-[#a8893d] text-[#080c18] font-bold rounded-lg text-xs hover:from-[#e0c068] hover:to-[#c9a84c] transition"
              >
                DISPATCH
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => load(page + 1, statusFilter, false)}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-[#0d1120] border border-[#1a1f32] rounded-xl text-sm text-neutral-400 hover:text-white hover:border-[#c9a84c] transition disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore ? <><Spinner size="sm" /> Loading...</> : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
