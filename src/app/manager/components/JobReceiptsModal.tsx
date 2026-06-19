"use client";

/**
 * JobReceiptsModal — lists all receipts linked to a job.
 * Clicking a receipt row opens ReceiptDispatchModal for that receipt.
 */

import { useCallback, useEffect, useState } from "react";
import { getLinkedReceipts, type LinkedReceiptSummary } from "@/lib/frappe";
import { getErrorMessage } from "@/lib/errors";
import ReceiptDispatchModal from "./ReceiptDispatchModal";

interface JobReceiptsModalProps {
  jobName: string;
  onClose: () => void;
  /** Called whenever a dispatch completes — lets the parent refresh job data. */
  onDispatched?: () => void;
}

const OCR_STATUS_COLORS: Record<string, string> = {
  parsed: "bg-emerald-900/50 text-emerald-300",
  pending: "bg-amber-900/50 text-amber-300",
  failed: "bg-red-900/50 text-red-300",
  processing: "bg-cyan-900/50 text-cyan-300",
};

export default function JobReceiptsModal({
  jobName,
  onClose,
  onDispatched,
}: JobReceiptsModalProps) {
  const [receipts, setReceipts] = useState<LinkedReceiptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  /** Receipt currently open in the dispatch view — null means show the list. */
  const [activeReceipt, setActiveReceipt] = useState<string | null>(null);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getLinkedReceipts(jobName);
      setReceipts(data);
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [jobName]);

  useEffect(() => {
    void loadReceipts();
  }, [loadReceipts]);

  const fmtCurrency = (n: number) =>
    `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // If a receipt is selected, hand off to ReceiptDispatchModal
  if (activeReceipt) {
    return (
      <ReceiptDispatchModal
        receiptName={activeReceipt}
        jobName={jobName}
        onClose={() => setActiveReceipt(null)}
        onDispatched={() => {
          // Refresh receipt list so counts update, then notify parent
          void loadReceipts();
          onDispatched?.();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Job receipts"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-navy-surface border border-navy-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-border shrink-0">
          <h2 className="font-serif text-lg font-bold">
            Receipts ({receipts.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-cream text-xl leading-none transition"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          )}

          {loadError && (
            <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300">
              {loadError}
            </div>
          )}

          {!loading && !loadError && receipts.length === 0 && (
            <p className="text-neutral-500 text-sm text-center py-8">
              No receipts linked to this job.
            </p>
          )}

          {!loading && receipts.length > 0 && (
            <ul className="space-y-2">
              {receipts.map((r) => (
                <li key={r.name}>
                  <button
                    type="button"
                    onClick={() => setActiveReceipt(r.name)}
                    className="w-full flex items-center gap-3 bg-navy border border-navy-border rounded-xl px-4 py-3 text-left hover:border-gold-dark/50 hover:bg-navy/80 transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label={`Open receipt ${r.name}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cream truncate">
                        {r.supplier ?? "Unknown Supplier"}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {r.receipt_date
                          ? new Date(r.receipt_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No date"}
                        <span
                          className={`ml-2 inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                            OCR_STATUS_COLORS[r.ocr_status] ?? "bg-neutral-700 text-neutral-400"
                          }`}
                        >
                          {r.ocr_status}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-sm font-medium text-gold">
                        {r.parsed_total ? fmtCurrency(r.parsed_total) : "—"}
                      </span>
                      <span className="text-neutral-600 group-hover:text-gold transition text-base">
                        →
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-navy-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-cream px-4 py-2 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
