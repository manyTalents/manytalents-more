"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  getPricebookList,
  updateItemPricing,
  bulkUpdateMarkup,
  updateGlobalMarkup,
  type PricebookItem,
  type UpdatePricingResponse,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

// ─────────────────────────────────────────────────────────────
// EditableCell — inline-editable number cell
// ─────────────────────────────────────────────────────────────

interface EditableCellProps {
  value: number;
  prefix?: string;
  suffix?: string;
  onSave: (val: number) => Promise<void>;
}

function EditableCell({ value, prefix, suffix, onSave }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(value > 0 ? String(value) : "");
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = async () => {
    const parsed = parseFloat(draft);
    if (isNaN(parsed) || parsed < 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft("");
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        {prefix && <span className="text-neutral-400 text-sm">{prefix}</span>}
        <input
          ref={inputRef}
          type="number"
          min="0"
          step="0.01"
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          onBlur={commit}
          className="w-24 bg-navy border border-gold-dark rounded px-2 py-1 text-sm text-cream focus:outline-none focus:ring-1 focus:ring-gold disabled:opacity-50"
        />
        {suffix && <span className="text-neutral-400 text-sm">{suffix}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-left hover:opacity-80 transition group"
      title="Click to edit"
    >
      {value > 0 ? (
        <span className="text-gold font-medium">
          {prefix}
          {value.toFixed(2)}
          {suffix}
        </span>
      ) : (
        <span className="text-neutral-600 group-hover:text-neutral-400 transition">—</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Source badge
// ─────────────────────────────────────────────────────────────

const SOURCE_STYLES: Record<string, { cls: string; label: string }> = {
  exact: { cls: "bg-emerald-900/60 text-emerald-300", label: "Exact $" },
  "item_%": { cls: "bg-blue-900/60 text-blue-300", label: "Item %" },
  "global_%": { cls: "bg-neutral-700 text-neutral-300", label: "Global %" },
  standard_rate: { cls: "bg-amber-900/60 text-amber-300", label: "Std Rate" },
  cost: { cls: "bg-red-900/60 text-red-300", label: "Cost Only" },
};

function SourceBadge({ source }: { source: string }) {
  const style = SOURCE_STYLES[source] ?? { cls: "bg-neutral-700 text-neutral-300", label: source };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${style.cls}`}>{style.label}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function PricingPage() {
  const router = useRouter();

  // Pricebook data
  const [items, setItems] = useState<PricebookItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [globalMarkup, setGlobalMarkup] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Global markup editing
  const [editingGlobal, setEditingGlobal] = useState(false);
  const [globalDraft, setGlobalDraft] = useState("");
  const [savingGlobal, setSavingGlobal] = useState(false);
  const globalInputRef = useRef<HTMLInputElement>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk markup
  const [bulkPct, setBulkPct] = useState("");
  const [savingBulk, setSavingBulk] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Auth check ──
  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
    }
  }, [router]);

  // ── Fetch data ──
  const fetchData = useCallback(
    async (q: string, pg: number) => {
      setLoading(true);
      setFetchError(null);
      try {
        const data = await getPricebookList(q, pg, PAGE_SIZE);
        setItems(data.items || []);
        setTotal(data.total || 0);
        setGlobalMarkup(data.global_markup_pct ?? 0);
        setPage(data.page || pg);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load pricebook";
        setFetchError(msg);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchData(search, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search debounce ──
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelected(new Set());
      fetchData(val, 1);
    }, 300);
  };

  // ── Pagination ──
  const goToPage = (pg: number) => {
    setSelected(new Set());
    fetchData(search, pg);
  };

  // ── Global markup ──
  const startGlobalEdit = () => {
    setGlobalDraft(globalMarkup > 0 ? String(globalMarkup) : "");
    setEditingGlobal(true);
    setTimeout(() => globalInputRef.current?.focus(), 0);
  };

  const saveGlobalMarkup = async () => {
    const parsed = parseFloat(globalDraft);
    if (isNaN(parsed) || parsed < 0) {
      setEditingGlobal(false);
      return;
    }
    setSavingGlobal(true);
    try {
      await updateGlobalMarkup(parsed);
      await fetchData(search, page);
    } catch (err) {
      console.warn("Failed to update global markup:", err);
    } finally {
      setSavingGlobal(false);
      setEditingGlobal(false);
    }
  };

  const cancelGlobalEdit = () => {
    setEditingGlobal(false);
    setGlobalDraft("");
  };

  // ── Item inline save ──
  const handleSaveMarkup = async (item: PricebookItem, pct: number) => {
    const res: UpdatePricingResponse = await updateItemPricing(item.item_code, undefined, pct);
    setItems((prev) =>
      prev.map((i) =>
        i.item_code === item.item_code
          ? {
              ...i,
              custom_markup_pct: res.custom_markup_pct,
              custom_selling_price: res.custom_selling_price,
              computed_selling_price: res.computed_selling_price,
              pricing_source: res.pricing_source as PricebookItem["pricing_source"],
            }
          : i
      )
    );
  };

  const handleSaveExact = async (item: PricebookItem, price: number) => {
    const res: UpdatePricingResponse = await updateItemPricing(item.item_code, price, undefined);
    setItems((prev) =>
      prev.map((i) =>
        i.item_code === item.item_code
          ? {
              ...i,
              custom_selling_price: res.custom_selling_price,
              custom_markup_pct: res.custom_markup_pct,
              computed_selling_price: res.computed_selling_price,
              pricing_source: res.pricing_source as PricebookItem["pricing_source"],
            }
          : i
      )
    );
  };

  // ── Selection ──
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.item_code));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.item_code)));
    }
  };

  const toggleOne = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // ── Bulk markup ──
  const handleBulkMarkup = async () => {
    const pct = parseFloat(bulkPct);
    if (isNaN(pct) || pct < 0 || selected.size === 0) return;
    setSavingBulk(true);
    try {
      await bulkUpdateMarkup(Array.from(selected), pct);
      setSelected(new Set());
      setBulkPct("");
      await fetchData(search, page);
    } catch (err) {
      console.warn("Bulk markup failed:", err);
    } finally {
      setSavingBulk(false);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* ── Global Markup Bar ── */}
        <div className="bg-navy-surface border border-navy-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
              Global Default Markup
            </p>
            <p className="text-sm text-neutral-400">
              Applied to all items that don&apos;t have an individual markup or exact price set.
            </p>
          </div>
          {editingGlobal ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                ref={globalInputRef}
                type="number"
                min="0"
                step="0.1"
                value={globalDraft}
                disabled={savingGlobal}
                onChange={(e) => setGlobalDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveGlobalMarkup();
                  if (e.key === "Escape") cancelGlobalEdit();
                }}
                placeholder="e.g. 25"
                className="w-28 bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark text-sm disabled:opacity-50"
              />
              <span className="text-neutral-400 text-sm">%</span>
              <button
                onClick={saveGlobalMarkup}
                disabled={savingGlobal}
                className="bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-4 py-2 rounded-lg text-sm hover:from-gold-light hover:to-gold transition disabled:opacity-50"
              >
                {savingGlobal ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelGlobalEdit}
                disabled={savingGlobal}
                className="text-sm text-neutral-400 hover:text-neutral-200 transition px-3 py-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={startGlobalEdit}
              className="flex items-center gap-3 flex-shrink-0 group"
            >
              <span className="text-3xl font-serif font-extrabold text-gold-gradient">
                {globalMarkup > 0 ? `${globalMarkup}%` : "—"}
              </span>
              <span className="text-xs text-neutral-500 group-hover:text-gold-light transition">
                Click to edit
              </span>
            </button>
          )}
        </div>

        {/* ── Search Bar ── */}
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by item name, code, or group…"
          className="w-full bg-navy-surface border border-navy-border rounded-lg px-5 py-3 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark"
        />

        {/* ── Bulk Actions Bar ── */}
        {someSelected && (
          <div className="bg-navy-surface border border-gold-dark/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="text-sm text-gold font-medium flex-1">
              {selected.size} item{selected.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-3">
              <label className="text-sm text-neutral-400">Set markup:</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={bulkPct}
                  disabled={savingBulk}
                  onChange={(e) => setBulkPct(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-24 bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark text-sm disabled:opacity-50"
                />
                <span className="text-neutral-400 text-sm">%</span>
              </div>
              <button
                onClick={handleBulkMarkup}
                disabled={savingBulk || !bulkPct}
                className="bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-4 py-2 rounded-lg text-sm hover:from-gold-light hover:to-gold transition disabled:opacity-50"
              >
                {savingBulk ? "Applying…" : "Set Markup"}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-neutral-400 hover:text-neutral-200 transition px-2 py-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Count ── */}
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          {loading
            ? "Loading…"
            : fetchError
            ? `Error: ${fetchError}`
            : `${total} item${total !== 1 ? "s" : ""}${search ? " matching search" : ""}`}
        </p>

        {/* ── Table ── */}
        <div className="bg-navy-surface border border-navy-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-navy-border">
                  {/* Checkbox */}
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-gold rounded"
                      title="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-neutral-500">
                    Item
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Cost
                  </th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Markup %
                  </th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Exact $
                  </th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Sells For
                  </th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider text-neutral-500">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-neutral-500">
                      Loading pricebook…
                    </td>
                  </tr>
                )}
                {!loading && fetchError && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-red-400">
                      {fetchError}
                    </td>
                  </tr>
                )}
                {!loading && !fetchError && items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-neutral-500">
                      No items found
                    </td>
                  </tr>
                )}
                {!loading &&
                  !fetchError &&
                  items.map((item) => (
                    <tr
                      key={item.item_code}
                      className="border-b border-navy-border/50 hover:bg-navy-card/50 transition"
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(item.item_code)}
                          onChange={() => toggleOne(item.item_code)}
                          className="accent-gold rounded"
                        />
                      </td>

                      {/* Item */}
                      <td className="px-4 py-3 min-w-[200px]">
                        <p className="font-medium text-cream leading-tight">{item.item_name}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {item.item_code}
                          {item.item_group ? ` · ${item.item_group}` : ""}
                        </p>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3 text-right text-neutral-400 whitespace-nowrap">
                        ${(item.cost ?? 0).toFixed(2)}
                      </td>

                      {/* Markup % — inline editable */}
                      <td className="px-4 py-3 text-center">
                        <EditableCell
                          value={item.custom_markup_pct ?? 0}
                          suffix="%"
                          onSave={(pct) => handleSaveMarkup(item, pct)}
                        />
                      </td>

                      {/* Exact $ — inline editable */}
                      <td className="px-4 py-3 text-center">
                        <EditableCell
                          value={item.custom_selling_price ?? 0}
                          prefix="$"
                          onSave={(price) => handleSaveExact(item, price)}
                        />
                      </td>

                      {/* Sells For */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-serif font-bold text-gold-gradient">
                          ${(item.computed_selling_price ?? 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3 text-center">
                        <SourceBadge source={item.pricing_source} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="bg-navy-surface border border-navy-border rounded-lg px-4 py-2 text-sm text-neutral-300 hover:border-gold-dark hover:text-cream transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages || loading}
                className="bg-navy-surface border border-navy-border rounded-lg px-4 py-2 text-sm text-neutral-300 hover:border-gold-dark hover:text-cream transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
