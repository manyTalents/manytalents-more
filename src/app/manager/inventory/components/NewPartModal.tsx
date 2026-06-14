"use client";

import { useState } from "react";
import { submitNewPart } from "@/lib/inventory-api";
import { Spinner } from "./Spinner";
import { TRADES } from "./utils";
import type { Trade } from "./utils";

// ── NewPartModal ──────────────────────────────

interface NewPartModalProps {
  prefillDescription: string;
  prefillSupplierCode: string;
  prefillSupplier: string;
  receiptItem: string;
  onSuccess: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function NewPartModal({
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
      console.warn("[NewPartModal] handleSubmit error:", e);
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
              placeholder='e.g. 3/4"'
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
