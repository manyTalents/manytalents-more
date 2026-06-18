"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchWarehouseStock,
  fetchWarehouseOptions,
  transferStockItem,
  adjustStockQty,
  type WarehouseCard,
  type WarehouseStockResponse,
  type StockItem,
  type WarehouseOption,
} from "@/lib/inventory-api";
import { getErrorMessage } from "@/lib/errors";
import { Spinner } from "./Spinner";
import { fmt$$ } from "./utils";

// ── WarehouseDetail ───────────────────────────

interface WarehouseDetailProps {
  warehouse: WarehouseCard;
  onBack: () => void;
}

export function WarehouseDetail({ warehouse, onBack }: WarehouseDetailProps) {
  const [data, setData] = useState<WarehouseStockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [error, setError] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Transfer modal state ──────────────────────
  const [transferItem, setTransferItem] = useState<StockItem | null>(null);
  const [transferQty, setTransferQty] = useState("1");
  const [warehouseOptions, setWarehouseOptions] = useState<WarehouseOption[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState("");

  // ── Inline qty-edit state ─────────────────────
  const [editingItemCode, setEditingItemCode] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [savingQty, setSavingQty] = useState(false);

  const load = useCallback(async (pg: number, q: string, sf: string, replace: boolean) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetchWarehouseStock(warehouse.name, pg, 50, q, sf);
      setData((prev) =>
        replace ? res : { ...res, items: [...(prev?.items || []), ...res.items] }
      );
      setPage(pg);
    } catch (e: unknown) {
      console.warn("[WarehouseDetail] load error:", e);
      setError(getErrorMessage(e));
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

  // ── Transfer handlers ─────────────────────────

  const openTransfer = async (item: StockItem) => {
    setTransferItem(item);
    setTransferQty(String(Math.min(item.actual_qty, 1) || 1));
    setTransferError("");
    setWarehousesLoading(true);
    try {
      const opts = await fetchWarehouseOptions();
      setWarehouseOptions(opts.filter((w) => w.warehouse !== warehouse.name));
    } catch (e: unknown) {
      console.warn("[WarehouseDetail] warehouse options load failed:", e);
      setWarehouseOptions([]);
    } finally {
      setWarehousesLoading(false);
    }
  };

  const closeTransfer = () => {
    setTransferItem(null);
    setTransferError("");
  };

  const handleTransfer = async (toWarehouse: string) => {
    if (!transferItem || transferring) return;
    const qty = parseFloat(transferQty);
    if (!qty || qty <= 0) { setTransferError("Enter a valid quantity"); return; }
    if (qty > transferItem.actual_qty) {
      setTransferError(`Only ${transferItem.actual_qty} available`);
      return;
    }
    setTransferring(true);
    setTransferError("");
    try {
      await transferStockItem(transferItem.item_code, warehouse.name, toWarehouse, qty);
      closeTransfer();
      load(1, search, stockFilter, true);
    } catch (e: unknown) {
      setTransferError(getErrorMessage(e));
    } finally {
      setTransferring(false);
    }
  };

  // ── Qty-edit handlers ─────────────────────────

  const startEdit = (item: StockItem) => {
    setEditingItemCode(item.item_code);
    setEditQty(String(item.actual_qty));
  };

  const cancelEdit = () => {
    setEditingItemCode(null);
    setEditQty("");
  };

  const commitEdit = async (item: StockItem) => {
    const newQty = parseFloat(editQty);
    if (isNaN(newQty) || newQty < 0) { cancelEdit(); return; }
    if (newQty === item.actual_qty) { cancelEdit(); return; }
    setSavingQty(true);
    try {
      await adjustStockQty(item.item_code, warehouse.name, newQty);
      cancelEdit();
      load(1, search, stockFilter, true);
    } catch (e: unknown) {
      console.warn("[WarehouseDetail] qty adjust failed:", e);
      // Show inline error; keep edit open so user can retry or dismiss
      setEditQty(String(item.actual_qty));
      cancelEdit();
    } finally {
      setSavingQty(false);
    }
  };

  const adjustQty = (delta: number) => {
    setTransferQty((prev) => {
      const next = Math.max(1, (parseFloat(prev) || 0) + delta);
      const cap = transferItem ? transferItem.actual_qty : Infinity;
      return String(Math.min(next, cap));
    });
  };

  return (
    <div>
      {/* Breadcrumb / header */}
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-32">
                    Qty
                    <span className="ml-1 text-[10px] text-neutral-600 normal-case tracking-normal">(click to edit)</span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-28">Value/Unit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-28">Total Value</th>
                  <th className="px-4 py-3 w-28 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: StockItem) => {
                  const isEditing = editingItemCode === item.item_code;
                  return (
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

                      {/* Qty — click to edit inline */}
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editQty}
                              onChange={(e) => setEditQty(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit(item);
                                if (e.key === "Escape") cancelEdit();
                              }}
                              onBlur={() => commitEdit(item)}
                              // eslint-disable-next-line jsx-a11y/no-autofocus
                              autoFocus
                              className="w-20 bg-[#1a1f32] border border-[#c9a84c] rounded px-2 py-1 text-right text-white text-sm font-mono focus:outline-none"
                            />
                            {savingQty && <Spinner size="sm" />}
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            title="Click to adjust quantity"
                            className="font-mono text-white hover:text-[#c9a84c] hover:underline transition cursor-pointer"
                          >
                            {item.actual_qty}
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-neutral-400">{fmt$$(item.valuation_rate)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#c9a84c] font-bold">{fmt$$(item.stock_value)}</td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.is_low_stock && (
                            <span className="text-[10px] font-bold text-[#E67E22] bg-[#E67E22]/10 px-2 py-0.5 rounded-full">
                              LOW
                            </span>
                          )}
                          <button
                            onClick={() => openTransfer(item)}
                            title="Transfer to another warehouse"
                            className="text-[11px] font-semibold text-[#c9a84c] hover:text-white border border-[#c9a84c]/40 hover:border-[#c9a84c] rounded-lg px-2.5 py-1 transition"
                          >
                            Transfer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* ── Transfer Modal ── */}
      {transferItem && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) closeTransfer(); }}
        >
          <div className="w-full sm:max-w-md bg-[#0d1120] border border-[#1a1f32] rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif font-bold text-white">Transfer Item</h3>
              <button
                onClick={closeTransfer}
                className="text-neutral-500 hover:text-white transition text-xl leading-none"
                aria-label="Close transfer modal"
              >
                &times;
              </button>
            </div>

            <p className="font-semibold text-white mb-0.5">{transferItem.item_name}</p>
            <p className="text-sm text-neutral-500 mb-4">
              Available: {transferItem.actual_qty} {/* UOM not in web StockItem — omit */}
            </p>

            {/* Qty stepper */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-semibold text-neutral-400 w-8">Qty:</span>
              <button
                onClick={() => adjustQty(-1)}
                disabled={transferring}
                className="w-10 h-10 rounded-lg bg-[#1a1f32] text-white font-bold text-lg hover:bg-[#c9a84c] hover:text-[#080c18] transition disabled:opacity-40"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max={transferItem.actual_qty}
                step="1"
                value={transferQty}
                onChange={(e) => setTransferQty(e.target.value)}
                className="w-20 text-center bg-[#1a1f32] border border-[#1a1f32] focus:border-[#c9a84c] rounded-lg px-2 py-2 text-white font-mono font-bold text-lg focus:outline-none"
              />
              <button
                onClick={() => adjustQty(1)}
                disabled={transferring}
                className="w-10 h-10 rounded-lg bg-[#1a1f32] text-white font-bold text-lg hover:bg-[#c9a84c] hover:text-[#080c18] transition disabled:opacity-40"
              >
                +
              </button>
            </div>

            {transferError && (
              <p className="text-[#dc3545] text-sm mb-3">{transferError}</p>
            )}

            {/* Destination list */}
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Send to:</p>

            {warehousesLoading && (
              <div className="flex justify-center py-4">
                <Spinner size="sm" />
              </div>
            )}

            {!warehousesLoading && warehouseOptions.length === 0 && (
              <p className="text-neutral-500 text-sm text-center py-4">No other warehouses available</p>
            )}

            {!warehousesLoading && warehouseOptions.map((wh) => (
              <button
                key={wh.warehouse}
                onClick={() => handleTransfer(wh.warehouse)}
                disabled={transferring}
                className="w-full mb-2 py-3 px-4 bg-[#c9a84c] hover:bg-[#b8963e] text-[#080c18] font-bold rounded-xl transition disabled:opacity-50 text-left"
              >
                {transferring ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" /> Transferring...</span>
                ) : (
                  wh.label
                )}
              </button>
            ))}

            <button
              onClick={closeTransfer}
              className="w-full mt-2 py-3 text-neutral-400 hover:text-white text-sm font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
