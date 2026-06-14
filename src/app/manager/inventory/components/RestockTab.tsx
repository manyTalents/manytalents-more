"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchPullLists,
  generatePullList,
  markPulled,
  ignorePullItem,
  resolveRejection,
  type TruckPullList,
  type PullListItem,
} from "@/lib/inventory-api";
import { Spinner } from "./Spinner";
import { SwapModal } from "./SwapModal";
import { TruckSection } from "./TruckSection";

// ── RestockTab ────────────────────────────────

export function RestockTab() {
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
      const sorted = [...(res.trucks || [])].sort(
        (a, b) => b.pending_count - a.pending_count
      );
      setTrucks(sorted);
      setError("");
    } catch (e: unknown) {
      console.warn("[RestockTab] loadData error:", e);
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
      console.warn("[RestockTab] handleRefresh error:", e);
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
      console.warn("[RestockTab] handlePullItem error:", e);
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
      console.warn("[RestockTab] handlePullAll error:", e);
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
      console.warn("[RestockTab] handleIgnore error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIgnoringItems((s) => ({ ...s, [item.name]: false }));
    }
  };

  const handleResolveSwap = async (newItemCode: string, newQty: number) => {
    if (!swapTarget) return;
    try {
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
    } catch (e: unknown) {
      console.warn("[RestockTab] handleResolveSwap error:", e);
      throw e;
    }
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
          <p className="text-neutral-400 text-sm mb-5">Hit Refresh Now to generate pull lists from today&apos;s jobs.</p>
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
