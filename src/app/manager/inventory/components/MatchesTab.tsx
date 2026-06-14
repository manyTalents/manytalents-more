"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchUnmatchedItems,
  approveMatch,
  markNotItem,
  correctMatch,
  bulkApprove,
  getConfidenceTier,
  type UnmatchedItem,
  type PricebookResult,
} from "@/lib/inventory-api";
import { Spinner } from "./Spinner";
import { PricebookSearch } from "./PricebookSearch";
import { NewPartModal } from "./NewPartModal";
import { PendingPartsSection } from "./PendingPartsSection";
import { fmt$$, fmtDate, scoreColor, scoreBg } from "./utils";

// ── MatchesTab ────────────────────────────────

interface MatchesTabProps {
  onCountChange?: (n: number) => void;
}

export function MatchesTab({ onCountChange }: MatchesTabProps) {
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
      console.warn("[MatchesTab] load error:", e);
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
      console.warn("[MatchesTab] handleApprove error:", e);
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
      console.warn("[MatchesTab] handleNotItem error:", e);
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
      console.warn("[MatchesTab] handleCorrect error:", e);
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
      console.warn("[MatchesTab] handleBulkApprove error:", e);
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
        {/* Table header */}
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

                  {/* NEW PART */}
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

              {/* Pricebook search panel */}
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
