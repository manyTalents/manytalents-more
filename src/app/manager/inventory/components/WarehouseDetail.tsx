"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchWarehouseStock,
  type WarehouseCard,
  type WarehouseStockResponse,
  type StockItem,
} from "@/lib/inventory-api";
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
                {data.items.map((item: StockItem) => (
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
