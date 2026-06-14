"use client";

import { useState } from "react";
import type { PullListItem } from "@/lib/inventory-api";
import { Spinner } from "./Spinner";

// ── SwapModal ─────────────────────────────────

interface SwapModalProps {
  item: PullListItem;
  onConfirm: (newItemCode: string, newQty: number) => Promise<void>;
  onClose: () => void;
}

export function SwapModal({ item, onConfirm, onClose }: SwapModalProps) {
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
      console.warn("[SwapModal] handleSubmit error:", e);
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
