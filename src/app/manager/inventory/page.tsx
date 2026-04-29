"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/frappe";
import { getFeatureFlags } from "@/lib/features";
import NavBar from "@/app/manager/components/NavBar";
import {
  fetchAllReceipts,
  fetchReceiptDetail,
  fetchWarehouseList,
  fetchWarehouseStock,
  fetchLimboItems,
  dispatchItems,
  dispatchAllToJob,
  fetchPullLists,
  generatePullList,
  markPulled,
  ignorePullItem,
  resolveRejection,
  fetchPullSummary,
  fetchUnmatchedItems,
  searchPricebook,
  correctMatch,
  approveMatch,
  bulkApprove,
  markNotItem,
  submitNewPart,
  fetchPendingParts,
  approveNewPart,
  rejectNewPart,
  getConfidenceTier,
  type ReceiptRow,
  type ReceiptDetail,
  type ReceiptItem,
  type ReceiptsResponse,
  type WarehouseCard,
  type WarehouseListResponse,
  type WarehouseStockResponse,
  type StockItem,
  type LimboGroup,
  type ItemDestination,
  type DispatchItemInput,
  type TruckPullList,
  type PullListItem,
  type PullSummary,
  type UnmatchedItem,
  type PricebookResult,
  type PricebookRequest,
} from "@/lib/inventory-api";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

type MainTab = "receipts" | "warehouses" | "limbo" | "restock" | "matches";
type StatusFilter = "" | "Pending" | "Complete" | "Failed";
type ViewMode = "table" | "cards";

const STATUS_DOT: Record<string, string> = {
  Complete: "bg-[#28a745]",
  Pending: "bg-[#E67E22]",
  Failed: "bg-[#dc3545]",
};

const STATUS_TEXT: Record<string, string> = {
  Complete: "text-[#28a745]",
  Pending: "text-[#E67E22]",
  Failed: "text-[#dc3545]",
};

const DESTINATIONS: ItemDestination[] = [
  "This Job",
  "Truck",
  "Office",
  "Limbo",
  "Diff Job",
  "Returned",
  "Lost",
];

const PAGE_SIZE = 25;

// ──────────────────────────────────────────────
// Utility helpers
// ──────────────────────────────────────────────

function fmt$$(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 2);
}

function matchColor(score: number): string {
  if (score >= 90) return "text-[#28a745]";
  if (score >= 70) return "text-[#E67E22]";
  return "text-[#dc3545]";
}

// ──────────────────────────────────────────────
// Destination button row (shared by table + card + limbo)
// ──────────────────────────────────────────────

interface DestButtonsProps {
  current: ItemDestination;
  hasJob: boolean;
  onSelect: (d: ItemDestination) => void;
  disabled?: boolean;
}

function DestButtons({ current, hasJob, onSelect, disabled }: DestButtonsProps) {
  const [truckOpen, setTruckOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-1">
      {DESTINATIONS.map((d) => {
        if (d === "This Job" && !hasJob) return null;
        const active = current === d;

        if (d === "Truck") {
          return (
            <div key={d} className="relative">
              <button
                disabled={disabled}
                onClick={() => setTruckOpen((v) => !v)}
                className={`min-h-[32px] px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap
                  ${active
                    ? "bg-[#c9a84c] text-[#080c18]"
                    : "bg-[#1a1f32] text-neutral-400 hover:text-white hover:bg-[#1e2540]"
                  } disabled:opacity-40`}
              >
                Truck {truckOpen ? "▲" : "▾"}
              </button>
              {truckOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-[#0d1120] border border-[#1a1f32] rounded-lg shadow-xl min-w-[140px]">
                  {["My Truck", "Other Truck"].map((t) => (
                    <button
                      key={t}
                      onClick={() => { onSelect("Truck"); setTruckOpen(false); }}
                      className="block w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-[#111627] hover:text-[#c9a84c] transition"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={d}
            disabled={disabled}
            onClick={() => onSelect(d)}
            className={`min-h-[32px] px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap
              ${active
                ? d === "Limbo"
                  ? "bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/50"
                  : "bg-[#c9a84c] text-[#080c18]"
                : "bg-[#1a1f32] text-neutral-400 hover:text-white hover:bg-[#1e2540]"
              } disabled:opacity-40`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────
// Spinner
// ──────────────────────────────────────────────

function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";
  return (
    <div className={`${s} rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin`} />
  );
}

// ──────────────────────────────────────────────
// SendButton (per-row dispatch)
// ──────────────────────────────────────────────

function SendButton({ onClick, loading, done }: { onClick: () => void; loading: boolean; done: boolean }) {
  if (done) {
    return (
      <span className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold text-[#28a745] bg-[#28a745]/10 border border-[#28a745]/30 flex items-center gap-1">
        Sent
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="min-h-[36px] px-3 py-1.5 bg-gradient-to-br from-[#28a745] to-[#1e7e34] text-white rounded-lg text-xs font-bold hover:from-[#34ce57] hover:to-[#28a745] transition disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
    >
      {loading ? <Spinner size="sm" /> : "SEND"}
    </button>
  );
}

// ──────────────────────────────────────────────
// DISPATCH VIEW
// ──────────────────────────────────────────────

interface DispatchViewProps {
  receiptName: string;
  onBack: () => void;
}

function DispatchView({ receiptName, onBack }: DispatchViewProps) {
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [dests, setDests] = useState<Record<string, ItemDestination>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [allChecked, setAllChecked] = useState(false);
  const [dispatchingAll, setDispatchingAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    setLoading(true);
    fetchReceiptDetail(receiptName)
      .then((d) => {
        setDetail(d);
        // Initialize destinations — default to current or "Limbo"
        const init: Record<string, ItemDestination> = {};
        const checks: Record<string, boolean> = {};
        for (const item of d.items) {
          init[item.name] = item.destination || "Limbo";
          checks[item.name] = false;
        }
        setDests(init);
        setChecked(checks);
        // Mark already dispatched items
        const sentInit: Record<string, boolean> = {};
        for (const item of d.items) {
          if (item.dispatched) sentInit[item.name] = true;
        }
        setSent(sentInit);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [receiptName]);

  const handleSendOne = async (item: ReceiptItem) => {
    if (!detail) return;
    setSending((s) => ({ ...s, [item.name]: true }));
    try {
      const payload: DispatchItemInput[] = [{
        item_name: item.name,
        destination: dests[item.name] || "Limbo",
      }];
      await dispatchItems(detail.hcp_job || "", payload);
      setSent((s) => ({ ...s, [item.name]: true }));
      showToast("Item dispatched.");
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSending((s) => ({ ...s, [item.name]: false }));
    }
  };

  const handleDispatchAll = async () => {
    if (!detail?.hcp_job) return;
    setDispatchingAll(true);
    try {
      const res = await dispatchAllToJob(detail.hcp_job);
      const newSent: Record<string, boolean> = { ...sent };
      for (const item of detail.items) newSent[item.name] = true;
      setSent(newSent);
      showToast(`Dispatched ${res.dispatched} item(s) to job.`);
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDispatchingAll(false);
    }
  };

  const handleSync = async () => {
    if (!detail) return;
    setSyncing(true);
    try {
      const checkedItems = detail.items.filter(
        (it) => checked[it.name] && (dests[it.name] || "Limbo") !== "Limbo" && !sent[it.name]
      );
      const payload: DispatchItemInput[] = checkedItems.map((it) => ({
        item_name: it.name,
        destination: dests[it.name],
      }));
      if (payload.length === 0) {
        showToast("No non-Limbo checked items to sync.");
        setSyncing(false);
        return;
      }
      const res = await dispatchItems(detail.hcp_job || "", payload);
      const newSent: Record<string, boolean> = { ...sent };
      for (const it of checkedItems) newSent[it.name] = true;
      setSent(newSent);
      showToast(`Synced ${res.dispatched} item(s).`);
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  const toggleAll = () => {
    const next = !allChecked;
    setAllChecked(next);
    if (!detail) return;
    const newChecked: Record<string, boolean> = {};
    for (const item of detail.items) newChecked[item.name] = next;
    setChecked(newChecked);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 text-[#dc3545] text-sm">
        {error || "Failed to load receipt."}
        <button onClick={onBack} className="ml-4 text-[#c9a84c] underline text-sm">Back</button>
      </div>
    );
  }

  const hasJob = !!detail.hcp_job;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1120] border border-[#c9a84c]/50 text-[#c9a84c] text-sm px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      {/* Back + header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-neutral-400 hover:text-[#c9a84c] transition flex items-center gap-1.5 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Receipts
          </button>
          <div className="h-4 w-px bg-[#1a1f32]" />
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider">{receiptName}</p>
            <h2 className="text-lg font-serif font-bold text-white">{detail.supplier}</h2>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
          <span className="font-bold text-[#c9a84c]">{fmt$$(detail.parsed_total)}</span>
          {detail.buyer_name && (
            <span className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-full bg-[#1a1f32] text-[10px] font-bold text-[#c9a84c] flex items-center justify-center">
                {initials(detail.buyer_name)}
              </span>
              {detail.buyer_name}
            </span>
          )}
          <span>{fmtDate(detail.receipt_date)}</span>
          {detail.hcp_job_id && (
            <span className="text-[#c9a84c] font-mono text-xs">#{detail.hcp_job_id}</span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {hasJob && (
          <button
            onClick={handleDispatchAll}
            disabled={dispatchingAll}
            className="flex items-center gap-2 bg-gradient-to-br from-[#28a745] to-[#1e7e34] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:from-[#34ce57] hover:to-[#28a745] transition disabled:opacity-50"
          >
            {dispatchingAll ? <Spinner size="sm" /> : null}
            DISPATCH ALL TO THIS JOB
          </button>
        )}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-[#1a1f32] text-neutral-300 font-semibold px-4 py-2.5 rounded-xl text-sm hover:text-white hover:bg-[#1e2540] transition disabled:opacity-50 border border-[#1a1f32]"
        >
          {syncing ? <Spinner size="sm" /> : null}
          SYNC CHECKED
        </button>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-[#0d1120] border border-[#1a1f32] rounded-xl p-1">
          {(["table", "cards"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                viewMode === m
                  ? "bg-[#c9a84c] text-[#080c18]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {m === "table" ? "Table" : "Cards"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-5 text-xs">
        {[
          { label: "Total", val: detail.dispatch_summary?.total ?? detail.items.length },
          { label: "Dispatched", val: detail.dispatch_summary?.dispatched ?? 0, color: "text-[#28a745]" },
          { label: "Pending", val: detail.dispatch_summary?.pending ?? 0, color: "text-[#E67E22]" },
          { label: "Limbo", val: detail.dispatch_summary?.limbo ?? 0, color: "text-[#E67E22]" },
        ].map((chip) => (
          <div key={chip.label} className="bg-[#0d1120] border border-[#1a1f32] rounded-lg px-3 py-1.5">
            <span className="text-neutral-500">{chip.label}: </span>
            <span className={`font-bold ${chip.color || "text-white"}`}>{chip.val}</span>
          </div>
        ))}
      </div>

      {/* Table view */}
      {viewMode === "table" && (
        <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1f32]">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-[#c9a84c]"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider min-w-[180px]">Item</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-16">Qty</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-24">Price</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider w-20">Match</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Destination</th>
                  <th className="px-3 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item, idx) => (
                  <tr
                    key={item.name}
                    className={`border-b border-[#1a1f32] last:border-0 hover:bg-[#111627] transition ${
                      sent[item.name] ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={!!checked[item.name]}
                        onChange={(e) => setChecked((c) => ({ ...c, [item.name]: e.target.checked }))}
                        className="w-4 h-4 rounded accent-[#c9a84c]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-white text-sm leading-tight">{item.matched_item_name || item.description}</p>
                      {item.product_code && (
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{item.product_code}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-white font-mono">{item.quantity}</td>
                    <td className="px-3 py-3 text-right text-[#c9a84c] font-mono">{fmt$$(item.unit_price)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-bold ${matchColor(item.match_score)}`}>
                        {item.match_score ? `${Math.round(item.match_score)}%` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <DestButtons
                        current={dests[item.name] || "Limbo"}
                        hasJob={hasJob}
                        onSelect={(d) => setDests((prev) => ({ ...prev, [item.name]: d }))}
                        disabled={!!sent[item.name]}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <SendButton
                        onClick={() => handleSendOne(item)}
                        loading={!!sending[item.name]}
                        done={!!sent[item.name]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card view */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {detail.items.map((item) => (
            <div
              key={item.name}
              className={`bg-[#0d1120] border border-[#1a1f32] rounded-2xl p-4 transition ${
                sent[item.name] ? "opacity-60" : "hover:border-[#c9a84c]/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white leading-tight">{item.matched_item_name || item.description}</p>
                  {item.product_code && (
                    <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{item.product_code}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[#c9a84c] font-bold font-mono">{fmt$$(item.unit_price)}</p>
                  <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                </div>
              </div>

              {item.match_score > 0 && (
                <p className={`text-xs mb-3 ${matchColor(item.match_score)}`}>
                  Match: {Math.round(item.match_score)}%
                </p>
              )}

              <div className="mb-3">
                <DestButtons
                  current={dests[item.name] || "Limbo"}
                  hasJob={hasJob}
                  onSelect={(d) => setDests((prev) => ({ ...prev, [item.name]: d }))}
                  disabled={!!sent[item.name]}
                />
              </div>

              <SendButton
                onClick={() => handleSendOne(item)}
                loading={!!sending[item.name]}
                done={!!sent[item.name]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// RECEIPTS TAB
// ──────────────────────────────────────────────

function ReceiptsTab() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [error, setError] = useState("");
  const [dispatchingReceipt, setDispatchingReceipt] = useState<string | null>(null);

  // Browser back button support — push history state when entering sub-views
  const openDispatch = useCallback((name: string) => {
    setDispatchingReceipt(name);
    window.history.pushState({ view: "dispatch", receipt: name }, "");
  }, []);

  const closeDispatch = useCallback(() => {
    setDispatchingReceipt(null);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      // Browser back pressed — close any open sub-view
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

// ──────────────────────────────────────────────
// WAREHOUSE DETAIL VIEW
// ──────────────────────────────────────────────

interface WarehouseDetailProps {
  warehouse: WarehouseCard;
  onBack: () => void;
}

function WarehouseDetail({ warehouse, onBack }: WarehouseDetailProps) {
  const [data, setData] = useState<WarehouseStockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async (pg: number, q: string, sf: string, replace: boolean) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetchWarehouseStock(warehouse.name, pg, 50, q, sf);
      setData((prev) =>
        replace ? res : { ...res, items: [...(prev?.items || []), ...res.items] }
      );
      setPage(pg);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load stock.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [warehouse.name]);

  useEffect(() => {
    load(1, search, stockFilter, true);
  }, [search, stockFilter, load]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-neutral-400 hover:text-[#c9a84c] transition flex items-center gap-1.5 text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Warehouses
        </button>
        <div className="h-4 w-px bg-[#1a1f32]" />
        <h2 className="text-lg font-serif font-bold text-white">{warehouse.display_name || warehouse.name}</h2>
        {warehouse.low_stock_count > 0 && (
          <span className="text-xs bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/30 px-2 py-0.5 rounded-full font-semibold">
            {warehouse.low_stock_count} low stock
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search items..."
            className="w-full bg-[#0d1120] border border-[#1a1f32] rounded-lg px-4 py-2 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c] transition"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#0d1120] border border-[#1a1f32] rounded-xl p-1">
          {[
            { val: "", label: "All" },
            { val: "low", label: "Low Stock" },
          ].map((opt) => (
            <button
              key={opt.val}
              onClick={() => setStockFilter(opt.val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                stockFilter === opt.val
                  ? "bg-[#c9a84c] text-[#080c18]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-[#dc3545] text-sm mb-4">{error}</p>}

      {loading && (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-neutral-400 text-sm">No items found</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1f32]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Item</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-24">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-28">Value/Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-28">Total Value</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: StockItem, idx: number) => (
                  <tr
                    key={item.item_code}
                    className={`border-b border-[#1a1f32] last:border-0 hover:bg-[#111627] transition ${
                      item.is_low_stock ? "border-l-2 border-l-[#E67E22]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white text-sm">{item.item_name}</p>
                      <p className="text-[11px] text-neutral-500 font-mono">{item.item_code}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{item.actual_qty}</td>
                    <td className="px-4 py-3 text-right font-mono text-neutral-400">{fmt$$(item.valuation_rate)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[#c9a84c] font-bold">{fmt$$(item.stock_value)}</td>
                    <td className="px-4 py-3 text-right">
                      {item.is_low_stock && (
                        <span className="text-[10px] font-bold text-[#E67E22] bg-[#E67E22]/10 px-2 py-0.5 rounded-full">
                          LOW
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data?.has_more && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => load(page + 1, search, stockFilter, false)}
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

// ──────────────────────────────────────────────
// WAREHOUSES TAB
// ──────────────────────────────────────────────

function WarehousesTab() {
  const [data, setData] = useState<WarehouseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<WarehouseCard | null>(null);

  useEffect(() => {
    fetchWarehouseList()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load warehouses."))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <WarehouseDetail warehouse={selected} onBack={() => setSelected(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-[#dc3545] text-sm">{error || "Failed to load."}</p>;
  }

  const allWarehouses: (WarehouseCard & { badge?: string })[] = [
    ...(data.my_truck ? [{ ...data.my_truck, badge: "MY TRUCK" }] : []),
    ...data.office.map((w) => ({ ...w, badge: "OFFICE" })),
    ...data.other_trucks.map((w) => ({ ...w })),
  ];

  if (allWarehouses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral-400 text-sm">No warehouses found</p>
      </div>
    );
  }

  return (
    <div>
      {/* MY TRUCK hero */}
      {data.my_truck && (
        <div className="mb-6">
          <p className="text-xs text-[#c9a84c] uppercase tracking-widest font-semibold mb-3">My Truck</p>
          <button
            onClick={() => setSelected(data.my_truck!)}
            className="w-full sm:max-w-md text-left bg-gradient-to-br from-[#1a2040] to-[#0d1120] border border-[#c9a84c]/30 rounded-2xl p-6 hover:border-[#c9a84c]/60 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-serif font-bold text-xl text-white">{data.my_truck.display_name || data.my_truck.name}</p>
                <p className="text-xs text-[#c9a84c] uppercase tracking-widest mt-1">My Truck</p>
              </div>
              <svg className="w-8 h-8 text-[#c9a84c]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{data.my_truck.total_items}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Items</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data.my_truck.total_qty}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Units</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[#c9a84c]">{fmt$$(data.my_truck.total_value)}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Value</p>
              </div>
            </div>
            {data.my_truck.low_stock_count > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#E67E22]" />
                <span className="text-xs text-[#E67E22] font-semibold">{data.my_truck.low_stock_count} items low on stock</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Office + Other trucks grid */}
      {(data.office.length > 0 || data.other_trucks.length > 0) && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">All Warehouses</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...data.office, ...data.other_trucks].map((w) => (
              <button
                key={w.name}
                onClick={() => setSelected(w)}
                className="text-left bg-[#0d1120] border border-[#1a1f32] rounded-2xl p-5 hover:border-[#c9a84c]/40 hover:-translate-y-0.5 transition-all"
              >
                <p className="font-serif font-semibold text-white mb-1">{w.display_name || w.name}</p>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <p className="text-lg font-bold text-white">{w.total_items}</p>
                    <p className="text-[10px] text-neutral-500">Items</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{w.total_qty}</p>
                    <p className="text-[10px] text-neutral-500">Units</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#c9a84c]">{fmt$$(w.total_value)}</p>
                    <p className="text-[10px] text-neutral-500">Value</p>
                  </div>
                </div>
                {w.low_stock_count > 0 && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E67E22]" />
                    <span className="text-[11px] text-[#E67E22]">{w.low_stock_count} low</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// LIMBO TAB
// ──────────────────────────────────────────────

function LimboTab() {
  const [groups, setGroups] = useState<LimboGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dests, setDests] = useState<Record<string, ItemDestination>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    fetchLimboItems()
      .then((res) => {
        setGroups(res.groups || []);
        const initDests: Record<string, ItemDestination> = {};
        for (const g of res.groups || []) {
          for (const it of g.items) {
            initDests[it.name] = it.destination || "Limbo";
          }
        }
        setDests(initDests);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load limbo items."))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (item: ReceiptItem, jobName: string) => {
    setSending((s) => ({ ...s, [item.name]: true }));
    try {
      await dispatchItems(jobName || "", [{
        item_name: item.name,
        destination: dests[item.name] || "Limbo",
      }]);
      setSent((s) => ({ ...s, [item.name]: true }));
      showToast("Dispatched.");
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSending((s) => ({ ...s, [item.name]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-[#dc3545] text-sm">{error}</p>;
  }

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-[#28a745]/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">Limbo is clear</p>
        <p className="text-neutral-400 text-sm">All items have been dispatched.</p>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1120] border border-[#c9a84c]/50 text-[#c9a84c] text-sm px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      <p className="text-xs text-[#E67E22] font-semibold uppercase tracking-wider mb-5">
        {totalItems} item{totalItems !== 1 ? "s" : ""} in limbo
      </p>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.receipt_name}>
            {/* Group header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">
                {group.supplier || group.receipt_name}
              </span>
              {group.hcp_job_id && (
                <span className="text-xs text-neutral-500 font-mono">#{group.hcp_job_id}</span>
              )}
              <div className="flex-1 h-px bg-[#1a1f32]" />
              <span className="text-xs text-neutral-500">{group.items.length} item{group.items.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
              {group.items.map((item, idx) => (
                <div
                  key={item.name}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 ${
                    idx < group.items.length - 1 ? "border-b border-[#1a1f32]" : ""
                  } ${sent[item.name] ? "opacity-50" : ""} hover:bg-[#111627] transition`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{item.matched_item_name || item.description}</p>
                    {item.product_code && (
                      <p className="text-[11px] text-neutral-500 font-mono">{item.product_code}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500">
                      <span>Qty: {item.quantity}</span>
                      <span>{fmt$$(item.unit_price)}</span>
                      {item.match_score > 0 && (
                        <span className={matchColor(item.match_score)}>
                          {Math.round(item.match_score)}% match
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <DestButtons
                      current={dests[item.name] || "Limbo"}
                      hasJob={!!group.hcp_job}
                      onSelect={(d) => setDests((prev) => ({ ...prev, [item.name]: d }))}
                      disabled={!!sent[item.name]}
                    />
                  </div>

                  <SendButton
                    onClick={() => handleSend(item, group.hcp_job)}
                    loading={!!sending[item.name]}
                    done={!!sent[item.name]}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// RESTOCK TAB
// ──────────────────────────────────────────────

// Swap-item modal — simple item code + qty entry to resolve a rejection
interface SwapModalProps {
  item: PullListItem;
  onConfirm: (newItemCode: string, newQty: number) => Promise<void>;
  onClose: () => void;
}

function SwapModal({ item, onConfirm, onClose }: SwapModalProps) {
  const [itemCode, setItemCode] = useState(item.item_code);
  const [qty, setQty] = useState(String(item.required_qty));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const parsedQty = parseFloat(qty);
    if (!itemCode.trim() || isNaN(parsedQty) || parsedQty <= 0) {
      setError("Enter a valid item code and quantity.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(itemCode.trim(), parsedQty);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resolve.");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-serif font-bold text-lg mb-1">Swap Item</h3>
        <p className="text-neutral-400 text-xs mb-5">
          Replacing: <span className="text-[#f0ebe0]">{item.item_name}</span>
          {item.reject_note && (
            <span className="block mt-1 text-[#dc3545] italic">"{item.reject_note}"</span>
          )}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              New Item Code
            </label>
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="e.g. PEX-34-TEE-34-12-34"
              className="w-full bg-[#080c18] border border-[#1a1f32] rounded-lg px-3 py-2.5 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Qty
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full bg-[#080c18] border border-[#1a1f32] rounded-lg px-3 py-2.5 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c] transition"
            />
          </div>
        </div>

        {error && <p className="text-[#dc3545] text-xs mt-3">{error}</p>}

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-[#c9a84c] to-[#a8893d] text-[#080c18] font-bold px-4 py-2.5 rounded-xl text-sm hover:from-[#e0c068] hover:to-[#c9a84c] transition disabled:opacity-50"
          >
            {saving ? <Spinner size="sm" /> : "CONFIRM SWAP"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 bg-[#1a1f32] text-neutral-400 hover:text-white rounded-xl text-sm font-semibold transition disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Single truck collapsible section
interface TruckSectionProps {
  truck: TruckPullList;
  onPullItem: (item: PullListItem) => Promise<void>;
  onPullAll: (truck: TruckPullList) => Promise<void>;
  pullingItems: Record<string, boolean>;
  pullingAll: Record<string, boolean>;
}

function TruckSection({ truck, onPullItem, onPullAll, pullingItems, pullingAll }: TruckSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pendingItems = truck.items.filter((i) => i.status === "Pending");

  return (
    <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#111627] transition text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-serif font-bold text-white text-base leading-tight">
            {truck.label || truck.warehouse}
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
            {truck.pending_count > 0 && (
              <span className="text-[#E67E22] font-semibold">{truck.pending_count} pending</span>
            )}
            {truck.pulled_count > 0 && (
              <span className="text-[#28a745] font-semibold">{truck.pulled_count} pulled</span>
            )}
            {truck.rejected_count > 0 && (
              <span className="text-[#dc3545] font-semibold">{truck.rejected_count} rejected</span>
            )}
          </div>
        </div>
        <span className="text-xs text-neutral-500 flex-shrink-0">
          {truck.items.length} item{truck.items.length !== 1 ? "s" : ""}
        </span>
        <svg
          className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-[#1a1f32]">
          {truck.items.filter((i) => i.status !== "Rejected" && i.status !== "Ignored").map((item, idx) => {
            const isLast = idx === truck.items.filter((i) => i.status !== "Rejected" && i.status !== "Ignored").length - 1;
            const isPulled = item.status === "Pulled" || item.status === "Accepted";
            const isPending = item.status === "Pending";

            return (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-5 py-3.5 ${!isLast ? "border-b border-[#1a1f32]" : ""} ${
                  isPulled ? "opacity-60" : "hover:bg-[#111627]"
                } transition`}
              >
                {/* Checkbox visual (reflects status, not interactive) */}
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                  isPulled
                    ? "bg-[#28a745] border-[#28a745]"
                    : "border-[#2a3050] bg-transparent"
                }`}>
                  {isPulled && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0ebe0] font-medium leading-tight">
                    {item.item_name}
                    {item.source_job_id && (
                      <span className="ml-2 text-[11px] text-[#c9a84c] font-mono">#{item.source_job_id}</span>
                    )}
                  </p>
                  {item.pulled_by && isPulled && (
                    <p className="text-[11px] text-neutral-500 mt-0.5">by {item.pulled_by}</p>
                  )}
                </div>

                {/* Qty */}
                <span className="text-sm font-mono text-neutral-400 flex-shrink-0">
                  x{item.required_qty}
                </span>

                {/* Action */}
                <div className="flex-shrink-0">
                  {isPulled ? (
                    <span className="text-xs font-bold text-[#28a745] flex items-center gap-1">
                      PULLED
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : isPending ? (
                    <button
                      onClick={() => onPullItem(item)}
                      disabled={!!pullingItems[item.name]}
                      className="min-h-[32px] px-3 py-1 bg-gradient-to-br from-[#c9a84c] to-[#a8893d] text-[#080c18] font-bold rounded-lg text-xs hover:from-[#e0c068] hover:to-[#c9a84c] transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {pullingItems[item.name] ? <Spinner size="sm" /> : "PULL"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Pull all footer */}
          {pendingItems.length > 1 && (
            <div className="px-5 py-3 border-t border-[#1a1f32] flex justify-end">
              <button
                onClick={() => onPullAll(truck)}
                disabled={!!pullingAll[truck.warehouse]}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] hover:border-[#c9a84c]/40 border border-[#1a1f32] rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {pullingAll[truck.warehouse] ? <Spinner size="sm" /> : null}
                PULL ALL AVAILABLE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RestockTab() {
  const [trucks, setTrucks] = useState<TruckPullList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [pullingItems, setPullingItems] = useState<Record<string, boolean>>({});
  const [pullingAll, setPullingAll] = useState<Record<string, boolean>>({});
  const [swapTarget, setSwapTarget] = useState<PullListItem | null>(null);
  const [ignoringItems, setIgnoringItems] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchPullLists();
      // Sort trucks: most pending items first
      const sorted = [...(res.trucks || [])].sort(
        (a, b) => b.pending_count - a.pending_count
      );
      setTrucks(sorted);
      setError("");
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : "Failed to load pull lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 60-second auto-poll
  useEffect(() => {
    loadData();
    pollRef.current = setInterval(() => loadData(true), 60_000);
    return () => clearInterval(pollRef.current);
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await generatePullList();
      await loadData(true);
      showToast("Pull list regenerated.");
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePullItem = async (item: PullListItem) => {
    setPullingItems((s) => ({ ...s, [item.name]: true }));
    try {
      await markPulled([item]);
      // Optimistic update
      setTrucks((prev) =>
        prev.map((t) => ({
          ...t,
          items: t.items.map((i) =>
            i.name === item.name ? { ...i, status: "Pulled" as const } : i
          ),
          pending_count: t.warehouse === item.truck_warehouse ? t.pending_count - 1 : t.pending_count,
          pulled_count: t.warehouse === item.truck_warehouse ? t.pulled_count + 1 : t.pulled_count,
        }))
      );
      showToast(`Marked pulled: ${item.item_name}`);
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setPullingItems((s) => ({ ...s, [item.name]: false }));
    }
  };

  const handlePullAll = async (truck: TruckPullList) => {
    const pendingItems = truck.items.filter((i) => i.status === "Pending");
    if (pendingItems.length === 0) return;
    setPullingAll((s) => ({ ...s, [truck.warehouse]: true }));
    try {
      await markPulled(pendingItems);
      setTrucks((prev) =>
        prev.map((t) => {
          if (t.warehouse !== truck.warehouse) return t;
          return {
            ...t,
            items: t.items.map((i) =>
              i.status === "Pending" ? { ...i, status: "Pulled" as const } : i
            ),
            pending_count: 0,
            pulled_count: t.pulled_count + pendingItems.length,
          };
        })
      );
      showToast(`Marked ${pendingItems.length} items pulled for ${truck.label || truck.warehouse}.`);
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setPullingAll((s) => ({ ...s, [truck.warehouse]: false }));
    }
  };

  const handleIgnore = async (item: PullListItem) => {
    setIgnoringItems((s) => ({ ...s, [item.name]: true }));
    try {
      await ignorePullItem(item.name);
      setTrucks((prev) =>
        prev.map((t) => ({
          ...t,
          items: t.items.map((i) =>
            i.name === item.name ? { ...i, status: "Ignored" as const } : i
          ),
          rejected_count:
            t.warehouse === item.truck_warehouse && item.status === "Rejected"
              ? t.rejected_count - 1
              : t.rejected_count,
        }))
      );
      showToast("Item ignored.");
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIgnoringItems((s) => ({ ...s, [item.name]: false }));
    }
  };

  const handleResolveSwap = async (newItemCode: string, newQty: number) => {
    if (!swapTarget) return;
    await resolveRejection(swapTarget.name, newItemCode, newQty);
    setTrucks((prev) =>
      prev.map((t) => ({
        ...t,
        items: t.items.map((i) =>
          i.name === swapTarget.name
            ? { ...i, item_code: newItemCode, required_qty: newQty, status: "Pending" as const, reject_note: "" }
            : i
        ),
        rejected_count:
          t.warehouse === swapTarget.truck_warehouse ? t.rejected_count - 1 : t.rejected_count,
        pending_count:
          t.warehouse === swapTarget.truck_warehouse ? t.pending_count + 1 : t.pending_count,
      }))
    );
    showToast("Rejection resolved — item re-queued as Pending.");
    setSwapTarget(null);
  };

  // All rejected items across all trucks (not Ignored)
  const allRejected = trucks.flatMap((t) =>
    t.items.filter((i) => i.status === "Rejected")
  );

  const totalItems = trucks.reduce((s, t) => s + t.items.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <p className="text-[#dc3545] text-sm">{error}</p>
        <button
          onClick={() => loadData()}
          className="px-4 py-2 bg-[#1a1f32] text-neutral-300 rounded-xl text-xs font-semibold hover:text-white transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1120] border border-[#c9a84c]/50 text-[#c9a84c] text-sm px-5 py-3 rounded-xl shadow-2xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* Swap modal */}
      {swapTarget && (
        <SwapModal
          item={swapTarget}
          onConfirm={handleResolveSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-white font-serif font-bold text-xl">Restock</h2>
          {trucks.length > 0 && (
            <p className="text-xs text-neutral-500 mt-0.5">
              Pull lists for today &middot; {totalItems} item{totalItems !== 1 ? "s" : ""} across {trucks.length} truck{trucks.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#c9a84c] to-[#a8893d] text-[#080c18] font-bold rounded-xl text-xs hover:from-[#e0c068] hover:to-[#c9a84c] transition disabled:opacity-50 self-start sm:self-auto"
        >
          {refreshing ? <Spinner size="sm" /> : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          Refresh Now
        </button>
      </div>

      {/* Empty state */}
      {trucks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-[#28a745]/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-1">No pull lists today</p>
          <p className="text-neutral-400 text-sm mb-5">Hit Refresh Now to generate pull lists from today's jobs.</p>
        </div>
      )}

      {/* Truck sections */}
      {trucks.length > 0 && (
        <div className="space-y-4 mb-8">
          {trucks.map((truck) => (
            <TruckSection
              key={truck.warehouse}
              truck={truck}
              onPullItem={handlePullItem}
              onPullAll={handlePullAll}
              pullingItems={pullingItems}
              pullingAll={pullingAll}
            />
          ))}
        </div>
      )}

      {/* Rejections section */}
      {allRejected.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold text-[#dc3545] uppercase tracking-wider">
              Rejections ({allRejected.length})
            </span>
            <div className="flex-1 h-px bg-[#1a1f32]" />
          </div>

          <div className="bg-[#0d1120] border border-[#dc3545]/30 rounded-2xl overflow-hidden">
            {allRejected.map((item, idx) => (
              <div
                key={item.name}
                className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 ${
                  idx < allRejected.length - 1 ? "border-b border-[#1a1f32]" : ""
                } hover:bg-[#111627] transition`}
              >
                {/* Rejection X icon */}
                <div className="w-5 h-5 rounded-full bg-[#dc3545]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-[#dc3545]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0ebe0] font-medium leading-tight">
                    {item.truck_label || item.truck_warehouse} rejected: {item.item_name}
                  </p>
                  {item.reject_note && (
                    <p className="text-[11px] text-[#dc3545] italic mt-0.5">"{item.reject_note}"</p>
                  )}
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    x{item.required_qty} &middot; {item.item_code}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSwapTarget(item)}
                    className="min-h-[32px] px-3 py-1.5 bg-gradient-to-br from-[#c9a84c] to-[#a8893d] text-[#080c18] font-bold rounded-lg text-xs hover:from-[#e0c068] hover:to-[#c9a84c] transition"
                  >
                    SWAP ITEM
                  </button>
                  <button
                    onClick={() => handleIgnore(item)}
                    disabled={!!ignoringItems[item.name]}
                    className="min-h-[32px] px-3 py-1.5 bg-[#1a1f32] text-neutral-400 hover:text-white border border-[#1a1f32] rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {ignoringItems[item.name] ? <Spinner size="sm" /> : "IGNORE"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// MATCHES TAB — helpers
// ──────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "text-[#28a745]";
  if (score >= 50) return "text-[#E67E22]";
  return "text-[#dc3545]";
}

function scoreBg(score: number): string {
  if (score >= 80) return "bg-[#28a745]/10 border-[#28a745]/30";
  if (score >= 50) return "bg-[#E67E22]/10 border-[#E67E22]/30";
  return "bg-[#dc3545]/10 border-[#dc3545]/30";
}

// Inline pricebook search for the FIX flow
interface PricebookSearchProps {
  onSelect: (result: PricebookResult) => void;
  onCancel: () => void;
}

function PricebookSearch({ onSelect, onCancel }: PricebookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PricebookResult[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runSearch = (q: string) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchPricebook(q, 8);
        setResults(res || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
  };

  const handleInput = (val: string) => {
    setQuery(val);
    runSearch(val);
  };

  return (
    <div className="mt-3 bg-[#080c18] border border-[#c9a84c]/40 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Search pricebook..."
            className="w-full bg-[#0d1120] border border-[#1a1f32] rounded-lg px-3 py-2 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c] transition pr-8"
          />
          {searching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition px-2 py-1.5 rounded-lg hover:bg-[#1a1f32]"
        >
          Cancel
        </button>
      </div>

      {results.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-[#1a1f32]">
          {results.map((r, idx) => (
            <button
              key={r.name}
              onClick={() => onSelect(r)}
              className={`w-full text-left px-3 py-2.5 hover:bg-[#111627] transition ${
                idx < results.length - 1 ? "border-b border-[#1a1f32]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#f0ebe0] font-medium leading-tight truncate">
                    {r.item_name}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {r.item_group} &middot; <span className="font-mono">{r.name}</span>
                  </p>
                </div>
                <span className="text-xs font-bold text-[#c9a84c] font-mono flex-shrink-0">
                  {fmt$$(r.standard_rate)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!searching && query.trim() && results.length === 0 && (
        <p className="text-xs text-neutral-500 text-center py-2">No results for "{query}"</p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// NEW PART MODAL
// ──────────────────────────────────────────────

const TRADES = ["Plumbing", "Electrical", "HVAC", "General"] as const;
type Trade = (typeof TRADES)[number];

interface NewPartModalProps {
  prefillDescription: string;
  prefillSupplierCode: string;
  prefillSupplier: string;
  receiptItem: string;
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

function NewPartModal({
  prefillDescription,
  prefillSupplierCode,
  prefillSupplier,
  receiptItem,
  onSuccess,
  onClose,
  showToast,
}: NewPartModalProps) {
  const [partName, setPartName] = useState(prefillDescription);
  const [trade, setTrade] = useState<Trade>("Plumbing");
  const [size, setSize] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!partName.trim()) return;
    setSubmitting(true);
    try {
      await submitNewPart({
        part_name: partName.trim(),
        trade,
        size: size.trim() || undefined,
        supplier_code: prefillSupplierCode || undefined,
        supplier: prefillSupplier || undefined,
        receipt_item: receiptItem || undefined,
      });
      showToast("New part request sent to office for review.");
      onSuccess();
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-serif font-bold text-lg">New Part Request</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Part Name <span className="text-[#dc3545]">*</span>
            </label>
            <input
              type="text"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              className="w-full bg-[#111627] border border-[#1a1f32] rounded-lg px-3 py-2.5 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c]/60 transition"
              placeholder="e.g. 3/4 Ball Valve"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Trade <span className="text-[#dc3545]">*</span>
            </label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value as Trade)}
              className="w-full bg-[#111627] border border-[#1a1f32] rounded-lg px-3 py-2.5 text-sm text-[#f0ebe0] focus:outline-none focus:border-[#c9a84c]/60 transition"
            >
              {TRADES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
              Size <span className="text-neutral-600">(optional)</span>
            </label>
            <input
              type="text"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full bg-[#111627] border border-[#1a1f32] rounded-lg px-3 py-2.5 text-sm text-[#f0ebe0] placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c]/60 transition"
              placeholder="e.g. 3/4&quot;"
            />
          </div>

          <p className="text-xs text-neutral-500 italic border-l-2 border-[#c9a84c]/30 pl-3">
            This will be sent to the office for review before being added to the pricebook.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-[#1a1f32] text-neutral-300 hover:text-white rounded-xl text-sm font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !partName.trim()}
            className="flex-1 px-4 py-2.5 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Spinner size="sm" /> : null}
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// PENDING PARTS SECTION
// ──────────────────────────────────────────────

function PendingPartsSection({ showToast }: { showToast: (msg: string) => void }) {
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
      .catch(() => {/* non-critical */})
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
    } catch {
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

                {/* Approve panel — optional pricebook search to link existing item */}
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

// ──────────────────────────────────────────────
// MATCHES TAB
// ──────────────────────────────────────────────

function MatchesTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [items, setItems] = useState<UnmatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState("");

  // Per-row UI state
  const [fixingRow, setFixingRow] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [resolvedRows, setResolvedRows] = useState<Set<string>>(new Set());

  // Bulk selection
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [allChecked, setAllChecked] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);

  // New Part modal
  const [newPartItem, setNewPartItem] = useState<UnmatchedItem | null>(null);

  // Keyboard navigation
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);

  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const load = useCallback(async (pg: number, replace: boolean) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetchUnmatchedItems(pg, 50);
      const incoming = res.items || [];
      setItems((prev) => replace ? incoming : [...prev, ...incoming]);
      setHasMore(res.has_more);
      setTotalCount(res.total_count);
      setPage(pg);
      if (replace) {
        const init: Record<string, boolean> = {};
        for (const it of incoming) init[it.name] = false;
        setChecked(init);
        setAllChecked(false);
      }
      onCountChange?.(res.total_count);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load match review items.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;
      if (isInputFocused) return;

      const visible = items.filter((i) => !resolvedRows.has(i.name));
      if (visible.length === 0) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setFocusedIdx((prev) => Math.min(prev + 1, visible.length - 1));
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setFocusedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < visible.length) {
          const item = visible[focusedIdx];
          if (item.matched_item) handleApprove(item);
        }
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setFocusedIdx((prev) => Math.min(prev + 1, visible.length - 1));
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < visible.length) {
          handleNotItem(visible[focusedIdx]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, resolvedRows, focusedIdx]);

  const removeRow = (name: string) => {
    setResolvedRows((prev) => new Set([...prev, name]));
    setTotalCount((n) => Math.max(0, n - 1));
    onCountChange?.(Math.max(0, totalCount - 1));
  };

  const handleApprove = async (item: UnmatchedItem) => {
    setActionLoading((s) => ({ ...s, [item.name]: true }));
    try {
      await approveMatch(item.name);
      removeRow(item.name);
      showToast("Match approved.");
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading((s) => ({ ...s, [item.name]: false }));
    }
  };

  const handleNotItem = async (item: UnmatchedItem) => {
    setActionLoading((s) => ({ ...s, [`ni_${item.name}`]: true }));
    try {
      await markNotItem(item.name);
      removeRow(item.name);
      showToast("Marked as non-item.");
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading((s) => ({ ...s, [`ni_${item.name}`]: false }));
    }
  };

  const handleCorrect = async (item: UnmatchedItem, result: PricebookResult) => {
    setActionLoading((s) => ({ ...s, [item.name]: true }));
    setFixingRow(null);
    try {
      await correctMatch(item.name, result.name, true);
      setItems((prev) =>
        prev.map((i) =>
          i.name === item.name
            ? { ...i, matched_item: result.name, match_score: 100, mapping_status: "Corrected" }
            : i
        )
      );
      showToast(`Matched to "${result.item_name}" — saved for future auto-matching.`);
      setTimeout(() => removeRow(item.name), 1500);
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading((s) => ({ ...s, [item.name]: false }));
    }
  };

  const toggleAll = () => {
    const next = !allChecked;
    setAllChecked(next);
    const newChecked: Record<string, boolean> = {};
    for (const it of items) {
      if (!resolvedRows.has(it.name)) newChecked[it.name] = next;
    }
    setChecked(newChecked);
  };

  const handleBulkApprove = async () => {
    const selected = items
      .filter((i) => checked[i.name] && !resolvedRows.has(i.name) && i.matched_item)
      .map((i) => i.name);
    if (selected.length === 0) {
      showToast("No items with matches selected.");
      return;
    }
    setBulkApproving(true);
    try {
      const res = await bulkApprove(selected);
      for (const name of selected) removeRow(name);
      setChecked({});
      setAllChecked(false);
      showToast(`Approved ${res.approved} match${res.approved !== 1 ? "es" : ""}.`);
    } catch (e: unknown) {
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setBulkApproving(false);
    }
  };

  const visibleItems = items.filter((i) => !resolvedRows.has(i.name));
  const checkedCount = Object.values(checked).filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-24">
        <p className="text-[#dc3545] text-sm">{error}</p>
        <button
          onClick={() => load(1, true)}
          className="px-4 py-2 bg-[#1a1f32] text-neutral-300 rounded-xl text-xs font-semibold hover:text-white transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (visibleItems.length === 0 && !hasMore) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-[#28a745]/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">All caught up</p>
        <p className="text-neutral-400 text-sm">No items need review.</p>
        <PendingPartsSection showToast={showToast} />
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1120] border border-[#c9a84c]/50 text-[#c9a84c] text-sm px-5 py-3 rounded-xl shadow-2xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* New Part Modal */}
      {newPartItem && (
        <NewPartModal
          prefillDescription={newPartItem.description}
          prefillSupplierCode={newPartItem.product_code}
          prefillSupplier={newPartItem.supplier}
          receiptItem={newPartItem.name}
          onSuccess={() => {
            removeRow(newPartItem.name);
            setNewPartItem(null);
          }}
          onClose={() => setNewPartItem(null)}
          showToast={showToast}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-white font-serif font-bold text-xl">Match Review</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {totalCount} item{totalCount !== 1 ? "s" : ""} needing review
          </p>
        </div>

        <div className="flex items-center gap-2">
          {checkedCount > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkApproving}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#28a745] to-[#1e7e34] text-white font-bold rounded-xl text-xs hover:from-[#34ce57] hover:to-[#28a745] transition disabled:opacity-50"
            >
              {bulkApproving ? <Spinner size="sm" /> : null}
              APPROVE CHECKED ({checkedCount})
            </button>
          )}
        </div>
      </div>

      {/* Keyboard nav hint */}
      <p className="text-[11px] text-neutral-600 mb-4 hidden md:block">
        Keyboard: <kbd className="bg-[#1a1f32] text-neutral-400 px-1.5 py-0.5 rounded text-[10px] font-mono">J</kbd> next &nbsp;
        <kbd className="bg-[#1a1f32] text-neutral-400 px-1.5 py-0.5 rounded text-[10px] font-mono">K</kbd> prev &nbsp;
        <kbd className="bg-[#1a1f32] text-neutral-400 px-1.5 py-0.5 rounded text-[10px] font-mono">Enter</kbd> approve &nbsp;
        <kbd className="bg-[#1a1f32] text-neutral-400 px-1.5 py-0.5 rounded text-[10px] font-mono">S</kbd> skip &nbsp;
        <kbd className="bg-[#1a1f32] text-neutral-400 px-1.5 py-0.5 rounded text-[10px] font-mono">N</kbd> not item
      </p>

      {/* Table */}
      <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
        {/* Table header — hidden on mobile, shown on md+ */}
        <div className="hidden md:grid grid-cols-[40px_1fr_120px_80px_180px_200px] gap-0 border-b border-[#1a1f32]">
          <div className="px-4 py-3 flex items-center">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-[#c9a84c]"
            />
          </div>
          {["OCR TEXT", "SUPPLIER", "SCORE", "CURRENT MATCH", "ACTIONS"].map((h) => (
            <div key={h} className="px-3 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {visibleItems.map((item, idx) => {
          const tier = getConfidenceTier(item.match_count ?? 0);
          const isLockedIn = tier === "locked_in";
          const isFirstMatch = tier === "first_match";
          const isFixing = fixingRow === item.name;
          const isLoading = !!actionLoading[item.name];
          const isNotItemLoading = !!actionLoading[`ni_${item.name}`];
          const hasMatch = !!item.matched_item;
          const isCorrected = item.mapping_status === "Corrected";
          const isFocused = focusedIdx === idx;

          // Locked-in rows render as collapsed single-line summary
          if (isLockedIn && !isFixing) {
            return (
              <div
                key={item.name}
                onClick={() => setFixingRow(item.name)}
                className={`border-b border-[#0D47A1] last:border-0 cursor-pointer transition ${
                  isFocused ? "ring-2 ring-inset ring-[#c9a84c]" : ""
                }`}
                style={{ backgroundColor: "#1565C0" }}
              >
                <div className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={!!checked[item.name]}
                      onChange={(e) => { e.stopPropagation(); setChecked((c) => ({ ...c, [item.name]: e.target.checked })); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded accent-[#c9a84c] flex-shrink-0"
                    />
                    <p className="text-sm text-white font-semibold leading-snug truncate">
                      {item.description}
                    </p>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                      LOCKED IN
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-white/80 text-xs">
                    <span>Qty: {item.quantity}</span>
                    {item.unit_price > 0 && <span>{fmt$$(item.unit_price)}</span>}
                    <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          }

          // Row background based on tier
          const rowBg = isLockedIn
            ? "bg-[#1565C0]"
            : isFirstMatch
            ? "bg-[#E3F2FD]"
            : isCorrected
            ? "bg-[#28a745]/5"
            : "";

          const rowText = isFirstMatch ? "text-[#1565C0]" : "";
          const borderColor = isFirstMatch ? "border-[#90CAF9]" : "border-[#1a1f32]";

          return (
            <div
              key={item.name}
              className={`border-b last:border-0 transition ${borderColor} ${rowBg} ${
                isFocused ? "ring-2 ring-inset ring-[#c9a84c]" : ""
              } ${isCorrected ? "opacity-60" : isFirstMatch ? "" : "hover:bg-[#111627]"}`}
            >
              {/* Main row — desktop grid */}
              <div className="hidden md:grid grid-cols-[40px_1fr_120px_80px_180px_200px] gap-0 px-0 py-3 items-start">
                {/* Checkbox */}
                <div className="px-4 pt-0.5">
                  <input
                    type="checkbox"
                    checked={!!checked[item.name]}
                    onChange={(e) => setChecked((c) => ({ ...c, [item.name]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#c9a84c]"
                  />
                </div>

                {/* OCR Text */}
                <div className="px-3 min-w-0">
                  {item.product_code && (
                    <p className={`text-[11px] font-mono font-bold mb-0.5 ${isFirstMatch ? "text-[#1565C0]" : "text-[#c9a84c]"}`}>
                      {item.product_code}
                    </p>
                  )}
                  <p className={`text-sm leading-snug break-words ${isFirstMatch ? "text-[#1565C0]" : "text-[#f0ebe0]"}`}>
                    {item.description}
                  </p>
                  <p className={`text-[10px] mt-1 ${isFirstMatch ? "text-[#1565C0]/60" : "text-neutral-600"}`}>
                    {fmtDate(item.receipt_date)} &middot; {item.receipt_name}
                  </p>
                </div>

                {/* Supplier */}
                <div className="px-3">
                  <span className={`text-xs ${isFirstMatch ? rowText : "text-neutral-300"}`}>{item.supplier || "—"}</span>
                </div>

                {/* Score */}
                <div className="px-3">
                  {item.match_score > 0 ? (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scoreColor(item.match_score)} ${scoreBg(item.match_score)}`}>
                      {Math.round(item.match_score)}%
                    </span>
                  ) : (
                    <span className={`text-xs ${isFirstMatch ? "text-[#1565C0]/50" : "text-neutral-600"}`}>—</span>
                  )}
                </div>

                {/* Current Match */}
                <div className="px-3">
                  {hasMatch ? (
                    <p className={`text-xs leading-snug font-mono break-all ${isFirstMatch ? "text-[#1565C0]" : "text-[#f0ebe0]"}`}>
                      {item.matched_item}
                    </p>
                  ) : (
                    <span className={`text-xs italic ${isFirstMatch ? "text-[#1565C0]/50" : "text-neutral-600"}`}>None</span>
                  )}
                  {isCorrected && (
                    <span className="text-[10px] text-[#28a745] font-semibold block mt-0.5">Corrected</span>
                  )}
                </div>

                {/* Actions */}
                <div className="px-3 flex items-center gap-1.5 flex-wrap">
                  {/* FIX */}
                  <button
                    onClick={() => setFixingRow(isFixing ? null : item.name)}
                    disabled={isLoading || isNotItemLoading}
                    className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-40 ${
                      isFixing
                        ? "bg-[#c9a84c] text-[#080c18]"
                        : isFirstMatch
                        ? "bg-[#1565C0]/10 border border-[#1565C0]/40 text-[#1565C0] hover:bg-[#1565C0]/20"
                        : "bg-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] hover:border-[#c9a84c]/40 border border-[#1a1f32]"
                    }`}
                  >
                    FIX
                  </button>

                  {/* APPROVE */}
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={isLoading || isNotItemLoading || !hasMatch}
                    title={!hasMatch ? "No match to approve" : "Approve this match"}
                    className={`min-h-[30px] px-2.5 py-1 border rounded-lg text-[11px] font-bold transition disabled:opacity-40 flex items-center gap-1 ${
                      isFirstMatch
                        ? "bg-[#1565C0]/10 border-[#1565C0]/40 text-[#1565C0] hover:bg-[#28a745]/10 hover:border-[#28a745]/40 hover:text-[#28a745]"
                        : "bg-[#1a1f32] border-[#1a1f32] text-neutral-300 hover:text-[#28a745] hover:border-[#28a745]/40"
                    }`}
                  >
                    {isLoading ? <Spinner size="sm" /> : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>

                  {/* NOT ITEM */}
                  <button
                    onClick={() => handleNotItem(item)}
                    disabled={isLoading || isNotItemLoading}
                    title="Mark as junk / not a real item"
                    className={`min-h-[30px] px-2.5 py-1 border rounded-lg text-[11px] font-bold transition disabled:opacity-40 flex items-center gap-1 ${
                      isFirstMatch
                        ? "bg-[#1565C0]/10 border-[#1565C0]/40 text-[#1565C0] hover:bg-[#dc3545]/10 hover:border-[#dc3545]/40 hover:text-[#dc3545]"
                        : "bg-[#1a1f32] border-[#1a1f32] text-neutral-300 hover:text-[#dc3545] hover:border-[#dc3545]/40"
                    }`}
                  >
                    {isNotItemLoading ? <Spinner size="sm" /> : (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>

                  {/* NEW PART — only for unmatched items */}
                  {!hasMatch && (
                    <button
                      onClick={() => setNewPartItem(item)}
                      disabled={isLoading || isNotItemLoading}
                      title="Submit as a new part request"
                      className="min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition disabled:opacity-40 bg-[#E67E22] text-white hover:bg-[#D35400]"
                    >
                      + New Part
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile card layout */}
              <div className="md:hidden px-4 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={!!checked[item.name]}
                    onChange={(e) => setChecked((c) => ({ ...c, [item.name]: e.target.checked }))}
                    className="w-4 h-4 rounded accent-[#c9a84c] mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    {item.product_code && (
                      <p className={`text-[11px] font-mono font-bold mb-0.5 ${isFirstMatch ? "text-[#1565C0]" : "text-[#c9a84c]"}`}>
                        {item.product_code}
                      </p>
                    )}
                    <p className={`text-sm leading-snug ${isFirstMatch ? "text-[#1565C0]" : "text-[#f0ebe0]"}`}>{item.description}</p>
                    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] ${isFirstMatch ? "text-[#1565C0]/70" : "text-neutral-500"}`}>
                      <span>{item.supplier || "—"}</span>
                      {item.match_score > 0 && (
                        <span className={`font-bold ${scoreColor(item.match_score)}`}>
                          {Math.round(item.match_score)}%
                        </span>
                      )}
                      <span>{fmtDate(item.receipt_date)}</span>
                    </div>
                    {hasMatch && (
                      <p className={`text-[11px] mt-1.5 font-mono break-all ${isFirstMatch ? "text-[#1565C0]/80" : "text-neutral-400"}`}>
                        Match: {item.matched_item}
                      </p>
                    )}
                    {!hasMatch && (
                      <p className={`text-[11px] mt-1.5 italic ${isFirstMatch ? "text-[#1565C0]/50" : "text-neutral-600"}`}>No match found</p>
                    )}
                  </div>
                </div>

                {/* Mobile action row */}
                <div className="flex items-center gap-2 pl-7 flex-wrap">
                  <button
                    onClick={() => setFixingRow(isFixing ? null : item.name)}
                    disabled={isLoading || isNotItemLoading}
                    className={`flex-1 min-h-[34px] rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                      isFixing
                        ? "bg-[#c9a84c] text-[#080c18]"
                        : "bg-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] border border-[#1a1f32]"
                    }`}
                  >
                    FIX
                  </button>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={isLoading || isNotItemLoading || !hasMatch}
                    className="min-h-[34px] px-3 bg-[#1a1f32] border border-[#1a1f32] text-neutral-300 hover:text-[#28a745] hover:border-[#28a745]/40 rounded-lg text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isLoading ? <Spinner size="sm" /> : "APPROVE"}
                  </button>
                  <button
                    onClick={() => handleNotItem(item)}
                    disabled={isLoading || isNotItemLoading}
                    className="min-h-[34px] px-3 bg-[#1a1f32] border border-[#1a1f32] text-neutral-300 hover:text-[#dc3545] hover:border-[#dc3545]/40 rounded-lg text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isNotItemLoading ? <Spinner size="sm" /> : "NOT ITEM"}
                  </button>
                  {!hasMatch && (
                    <button
                      onClick={() => setNewPartItem(item)}
                      disabled={isLoading || isNotItemLoading}
                      className="min-h-[34px] px-3 bg-[#E67E22] hover:bg-[#D35400] text-white rounded-lg text-xs font-semibold transition disabled:opacity-40"
                    >
                      + New Part
                    </button>
                  )}
                </div>
              </div>

              {/* Pricebook search panel — expands below the row */}
              {isFixing && (
                <div className="px-4 pb-4 md:pl-[52px]">
                  <PricebookSearch
                    onSelect={(result) => handleCorrect(item, result)}
                    onCancel={() => setFixingRow(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => load(page + 1, false)}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-[#0d1120] border border-[#1a1f32] rounded-xl text-sm text-neutral-400 hover:text-white hover:border-[#c9a84c] transition disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore ? <><Spinner size="sm" /> Loading...</> : "Load more"}
          </button>
        </div>
      )}

      {/* Pending Parts Section */}
      <PendingPartsSection showToast={showToast} />
    </div>
  );
}

// ──────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────

export default function InventoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>("receipts");
  const [summary, setSummary] = useState({ pending_receipts: 0, pending_limbo_items: 0, restock_items: 0 });
  const [restockBadge, setRestockBadge] = useState(0);
  const [matchesBadge, setMatchesBadge] = useState(0);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    if (!getFeatureFlags().inventory) { router.replace("/manager/dashboard"); return; }
    // Fetch summary for badge counts
    import("@/lib/inventory-api").then(({ fetchInventorySummary, fetchPullSummary, fetchUnmatchedItems }) => {
      fetchInventorySummary()
        .then(setSummary)
        .catch(() => {/* non-critical */});
      fetchPullSummary()
        .then((s: PullSummary) => setRestockBadge(s.pending + s.rejected))
        .catch(() => {/* non-critical */});
      fetchUnmatchedItems(1, 1)
        .then((r) => setMatchesBadge(r.total_count))
        .catch(() => {/* non-critical */});
    });
  }, [router]);

  const TABS: { key: MainTab; label: string; badge?: number }[] = [
    { key: "receipts", label: "RECEIPTS", badge: summary.pending_receipts || undefined },
    { key: "warehouses", label: "WAREHOUSES" },
    { key: "limbo", label: "LIMBO", badge: summary.pending_limbo_items || undefined },
    { key: "restock", label: "RESTOCK", badge: restockBadge || undefined },
    { key: "matches", label: "MATCHES", badge: matchesBadge || undefined },
  ];

  return (
    <div className="min-h-screen bg-[#080c18]">
      <NavBar />

      {/* Sub-tab bar */}
      <div className="bg-[#0d1120] border-b border-[#1a1f32] sticky top-[49px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3 text-xs font-bold tracking-widest uppercase transition border-b-2 ${
                  activeTab === tab.key
                    ? "border-[#c9a84c] text-[#c9a84c]"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 bg-[#E67E22] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "receipts" && <ReceiptsTab />}
        {activeTab === "warehouses" && <WarehousesTab />}
        {activeTab === "limbo" && <LimboTab />}
        {activeTab === "restock" && <RestockTab />}
        {activeTab === "matches" && (
          <MatchesTab onCountChange={(n) => setMatchesBadge(n)} />
        )}
      </main>
    </div>
  );
}
