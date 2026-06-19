"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listSupplierMappings,
  updateSupplierMapping,
  deleteSupplierMapping,
  type SupplierMapping,
} from "@/lib/inventory-api";
import { Spinner } from "./Spinner";
import { PricebookSearch } from "./PricebookSearch";
import type { PricebookResult } from "@/lib/inventory-api";

// ── MappingsTab ───────────────────────────────────────────────
// Office-only QC screen for confirmed supplier-code → item mappings.
// Backend enforces OFFICE_ROLES; this component also gates the UI.

export function MappingsTab() {
  const [rows, setRows] = useState<SupplierMapping[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [filterInput, setFilterInput] = useState("");

  // Per-row edit / delete state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const PAGE_SIZE = 50;

  const load = useCallback(
    async (pg: number, replace: boolean, supplier?: string) => {
      if (pg === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await listSupplierMappings(supplier, pg);
        setRows((prev) => (replace ? res.rows : [...prev, ...res.rows]));
        setTotal(res.total);
        setPage(pg);
      } catch (e: unknown) {
        console.warn("[MappingsTab] load error:", e);
        setError(e instanceof Error ? e.message : "Failed to load mappings.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    load(1, true, supplierFilter || undefined);
  }, [load, supplierFilter]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSupplierFilter(filterInput.trim());
  };

  const handleEdit = async (row: SupplierMapping, result: PricebookResult) => {
    setActionLoading((s) => ({ ...s, [`edit_${row.name}`]: true }));
    setEditingRow(null);
    try {
      await updateSupplierMapping(row.name, result.name);
      showToast(`Mapping updated to "${result.item_name}".`);
      // Reload page to reflect the change
      await load(1, true, supplierFilter || undefined);
    } catch (e: unknown) {
      console.warn("[MappingsTab] handleEdit error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading((s) => ({ ...s, [`edit_${row.name}`]: false }));
    }
  };

  const handleDelete = async (row: SupplierMapping) => {
    setActionLoading((s) => ({ ...s, [`del_${row.name}`]: true }));
    setDeleteConfirmRow(null);
    try {
      await deleteSupplierMapping(row.name);
      showToast("Mapping deleted.");
      await load(1, true, supplierFilter || undefined);
    } catch (e: unknown) {
      console.warn("[MappingsTab] handleDelete error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setActionLoading((s) => ({ ...s, [`del_${row.name}`]: false }));
    }
  };

  const hasMore = rows.length < total;

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
          onClick={() => load(1, true, supplierFilter || undefined)}
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-white font-serif font-bold text-xl">Supplier Mappings</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            {total} confirmed supplier-code → item mapping{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Supplier filter */}
        <form onSubmit={handleFilterSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            placeholder="Filter by supplier..."
            className="px-3 py-2 bg-[#0d1120] border border-[#1a1f32] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c]/50 w-44"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-[#1a1f32] text-neutral-300 rounded-xl text-xs font-semibold hover:text-white hover:border-[#c9a84c] border border-[#1a1f32] transition"
          >
            Filter
          </button>
          {supplierFilter && (
            <button
              type="button"
              onClick={() => { setFilterInput(""); setSupplierFilter(""); }}
              className="px-2 py-2 text-neutral-500 hover:text-white transition text-xs"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-white font-semibold mb-1">No mappings yet</p>
          <p className="text-neutral-400 text-sm">
            Confirmed supplier-code → item mappings will appear here once techs confirm AI suggestions.
          </p>
        </div>
      ) : (
        <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[180px_1fr_1fr_80px_180px] gap-0 border-b border-[#1a1f32]">
            {["SUPPLIER CODE", "SUPPLIER", "OUR ITEM", "CONFIRMS", "ACTIONS"].map((h) => (
              <div key={h} className="px-4 py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                {h}
              </div>
            ))}
          </div>

          {rows.map((row) => {
            const isEditing = editingRow === row.name;
            const isConfirmDelete = deleteConfirmRow === row.name;
            const isEditLoading = !!actionLoading[`edit_${row.name}`];
            const isDelLoading = !!actionLoading[`del_${row.name}`];

            return (
              <div
                key={row.name}
                className="border-b border-[#1a1f32] last:border-0"
              >
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-[180px_1fr_1fr_80px_180px] gap-0 px-0 py-3 items-start hover:bg-[#111627] transition">
                  {/* Supplier Code */}
                  <div className="px-4">
                    <p className="text-xs font-mono font-bold text-[#c9a84c] break-all">
                      {row.supplier_part_no || "—"}
                    </p>
                  </div>

                  {/* Supplier */}
                  <div className="px-4">
                    <p className="text-xs text-neutral-300">{row.supplier || "—"}</p>
                  </div>

                  {/* Our Item */}
                  <div className="px-4">
                    <p className="text-xs text-white font-medium">{row.item_name}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">{row.parent}</p>
                  </div>

                  {/* Confirmations */}
                  <div className="px-4">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      row.match_count >= 5
                        ? "bg-[#1565C0] text-white"
                        : row.match_count >= 1
                        ? "bg-[#E3F2FD] text-[#1565C0]"
                        : "bg-neutral-800 text-neutral-400"
                    }`}>
                      {row.match_count}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="px-4 flex items-center gap-2">
                    <button
                      onClick={() => setEditingRow(isEditing ? null : row.name)}
                      disabled={isEditLoading || isDelLoading}
                      className={`min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] font-bold transition disabled:opacity-40 ${
                        isEditing
                          ? "bg-[#c9a84c] text-[#080c18]"
                          : "bg-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] border border-[#1a1f32] hover:border-[#c9a84c]/40"
                      }`}
                    >
                      {isEditLoading ? <Spinner size="sm" /> : "EDIT"}
                    </button>
                    {isConfirmDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={isDelLoading}
                          className="min-h-[28px] px-2 py-1 rounded-lg text-[11px] font-bold bg-[#dc3545] text-white hover:bg-[#b02a37] transition disabled:opacity-40 flex items-center gap-1"
                        >
                          {isDelLoading ? <Spinner size="sm" /> : "Confirm"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmRow(null)}
                          className="min-h-[28px] px-2 py-1 rounded-lg text-[11px] font-bold bg-[#1a1f32] text-neutral-400 hover:text-white border border-[#1a1f32] transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmRow(row.name)}
                        disabled={isDelLoading || isEditLoading}
                        className="min-h-[28px] px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#1a1f32] text-neutral-300 hover:text-[#dc3545] border border-[#1a1f32] hover:border-[#dc3545]/40 transition disabled:opacity-40"
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden px-4 py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono font-bold text-[#c9a84c] mb-0.5">
                        {row.supplier_part_no || "—"}
                      </p>
                      <p className="text-sm text-white font-medium leading-snug">{row.item_name}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{row.supplier} &middot; {row.parent}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      row.match_count >= 5
                        ? "bg-[#1565C0] text-white"
                        : "bg-[#E3F2FD] text-[#1565C0]"
                    }`}>
                      {row.match_count}x
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingRow(isEditing ? null : row.name)}
                      disabled={isEditLoading || isDelLoading}
                      className={`flex-1 min-h-[34px] rounded-lg text-xs font-bold transition disabled:opacity-40 ${
                        isEditing ? "bg-[#c9a84c] text-[#080c18]" : "bg-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] border border-[#1a1f32]"
                      }`}
                    >
                      {isEditLoading ? <Spinner size="sm" /> : "EDIT"}
                    </button>
                    {isConfirmDelete ? (
                      <>
                        <button
                          onClick={() => handleDelete(row)}
                          disabled={isDelLoading}
                          className="min-h-[34px] px-3 bg-[#dc3545] text-white rounded-lg text-xs font-bold transition disabled:opacity-40"
                        >
                          {isDelLoading ? <Spinner size="sm" /> : "Confirm Delete"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmRow(null)}
                          className="min-h-[34px] px-3 bg-[#1a1f32] text-neutral-400 hover:text-white border border-[#1a1f32] rounded-lg text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmRow(row.name)}
                        disabled={isDelLoading || isEditLoading}
                        className="min-h-[34px] px-3 bg-[#1a1f32] text-neutral-300 hover:text-[#dc3545] border border-[#1a1f32] hover:border-[#dc3545]/40 rounded-lg text-xs font-bold transition disabled:opacity-40"
                      >
                        DELETE
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline pricebook search for edit */}
                {isEditing && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-neutral-400 mb-2">
                      Search for the correct item to re-point this mapping:
                    </p>
                    <PricebookSearch
                      onSelect={(result) => handleEdit(row, result)}
                      onCancel={() => setEditingRow(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => load(page + 1, false, supplierFilter || undefined)}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-[#0d1120] border border-[#1a1f32] rounded-xl text-sm text-neutral-400 hover:text-white hover:border-[#c9a84c] transition disabled:opacity-50 flex items-center gap-2"
          >
            {loadingMore ? <><Spinner size="sm" /> Loading...</> : `Load more (${total - rows.length} remaining)`}
          </button>
        </div>
      )}
    </div>
  );
}
