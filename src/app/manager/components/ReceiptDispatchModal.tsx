"use client";

/**
 * ReceiptDispatchModal — web parity for mobile ReceiptDetailScreen.
 *
 * Shows every parsed line on a receipt with:
 *   - Item description, qty, unit price
 *   - Destination picker: This Job / Different Job / Truck Stock / Warehouse / Return / Discard
 *   - "Different Job" reveals a job search input
 *   - Already-dispatched lines shown as done (greyed, badge with where they went)
 *   - Bulk "All -> Job" / "All -> Truck Stock" / "All -> Warehouse" row
 *   - DISPATCH button sends all pending lines with a picked destination
 */

import { useCallback, useEffect, useState } from "react";
import {
  getReceiptDispatchState,
  dispatchReceiptItems,
  getJobList,
  type ReceiptDispatchState,
  type ReceiptDispatchLine,
  type ReceiptDispatchDestination,
  type ReceiptDispatchPayloadItem,
} from "@/lib/frappe";
import { getErrorMessage } from "@/lib/errors";

// ── Types ────────────────────────────────────────────────────────────────────

interface JobOption {
  name: string;
  hcp_job_id: string;
  customer_name: string;
  address: string;
}

interface LineState {
  destination: ReceiptDispatchDestination | "";
  differentJob: string; // job name when destination === "Different Job"
}

const ALL_DESTINATIONS: ReceiptDispatchDestination[] = [
  "This Job",
  "Different Job",
  "Truck Stock",
  "Warehouse",
  "Return",
  "Discard",
];

const DEST_COLORS: Record<ReceiptDispatchDestination, string> = {
  "This Job": "bg-emerald-900/50 text-emerald-300 border-emerald-800/60",
  "Different Job": "bg-cyan-900/50 text-cyan-300 border-cyan-800/60",
  "Truck Stock": "bg-blue-900/50 text-blue-300 border-blue-800/60",
  Warehouse: "bg-indigo-900/50 text-indigo-300 border-indigo-800/60",
  Return: "bg-amber-900/50 text-amber-300 border-amber-800/60",
  Discard: "bg-red-900/50 text-red-300 border-red-800/60",
};

// ── Props ────────────────────────────────────────────────────────────────────

interface ReceiptDispatchModalProps {
  receiptName: string;
  /** Job name in context — pre-fills "This Job" when set. */
  jobName?: string;
  onClose: () => void;
  /** Called after a successful dispatch so the parent can refresh. */
  onDispatched?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReceiptDispatchModal({
  receiptName,
  jobName,
  onClose,
  onDispatched,
}: ReceiptDispatchModalProps) {
  const [state, setState] = useState<ReceiptDispatchState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [lineStates, setLineStates] = useState<Record<string, LineState>>({});
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [jobSearch, setJobSearch] = useState("");

  const [dispatching, setDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState("");
  const [dispatchResult, setDispatchResult] = useState("");

  // ── Load receipt state ────────────────────────────────────────────────────

  const loadState = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [data, jobListRaw] = await Promise.allSettled([
        getReceiptDispatchState(receiptName),
        getJobList(),
      ]);

      if (data.status === "rejected") {
        throw data.reason;
      }

      const s = data.value;
      setState(s);

      // Build line state defaults — pending lines start with no destination
      const defaults: Record<string, LineState> = {};
      for (const line of s.lines) {
        if (!line.dispatched) {
          defaults[line.parsed_item_row] = { destination: "", differentJob: "" };
        }
      }
      setLineStates(defaults);

      // Jobs for "Different Job" picker — exclude current job
      if (jobListRaw.status === "fulfilled") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- getJobList returns untyped Frappe records
        const raw: any[] = Array.isArray(jobListRaw.value) ? jobListRaw.value : (jobListRaw.value as any)?.jobs ?? [];
        setJobs(
          raw
            .filter((j) => j.name !== jobName)
            .map((j) => ({
              name: j.name,
              hcp_job_id: j.hcp_job_id || j.name,
              customer_name: j.customer_name || "",
              address: j.address || "",
            }))
        );
      }
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [receiptName, jobName]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // ── Line state helpers ────────────────────────────────────────────────────

  const setLineDest = (rowName: string, dest: ReceiptDispatchDestination | "") => {
    setLineStates((prev) => ({
      ...prev,
      [rowName]: { ...prev[rowName], destination: dest, differentJob: dest !== "Different Job" ? "" : (prev[rowName]?.differentJob ?? "") },
    }));
  };

  const setLineDiffJob = (rowName: string, jobN: string) => {
    setLineStates((prev) => ({
      ...prev,
      [rowName]: { ...prev[rowName], differentJob: jobN },
    }));
  };

  const setAllDest = (dest: ReceiptDispatchDestination) => {
    if (!state) return;
    const next: Record<string, LineState> = { ...lineStates };
    for (const line of state.lines) {
      if (!line.dispatched) {
        next[line.parsed_item_row] = { destination: dest, differentJob: "" };
      }
    }
    setLineStates(next);
  };

  // ── Dispatch ──────────────────────────────────────────────────────────────

  const handleDispatch = async () => {
    if (!state) return;
    setDispatchError("");
    setDispatchResult("");

    const pending = state.lines.filter((l) => !l.dispatched);
    const withDest = pending.filter((l) => lineStates[l.parsed_item_row]?.destination);
    if (withDest.length === 0) {
      setDispatchError("Select a destination for at least one item.");
      return;
    }

    // Validate "Different Job" lines have a job selected
    const missingJob = withDest.filter(
      (l) =>
        lineStates[l.parsed_item_row].destination === "Different Job" &&
        !lineStates[l.parsed_item_row].differentJob
    );
    if (missingJob.length > 0) {
      setDispatchError(`${missingJob.length} item(s) set to "Different Job" need a job selected.`);
      return;
    }

    const payload: ReceiptDispatchPayloadItem[] = withDest.map((l) => {
      const ls = lineStates[l.parsed_item_row];
      const dest = ls.destination as ReceiptDispatchDestination;
      const item: ReceiptDispatchPayloadItem = {
        parsed_item_row: l.parsed_item_row,
        destination: dest,
        dispatch_quantity: l.quantity,
      };
      if (dest === "This Job" && jobName) {
        item.destination_job = jobName;
      } else if (dest === "Different Job" && ls.differentJob) {
        item.destination_job = ls.differentJob;
      }
      return item;
    });

    setDispatching(true);
    try {
      const res = await dispatchReceiptItems(receiptName, payload);
      setDispatchResult(`${res.dispatched} item${res.dispatched !== 1 ? "s" : ""} dispatched.`);
      onDispatched?.();
      // Reload so dispatched lines show their badges
      await loadState();
    } catch (e: unknown) {
      setDispatchError(getErrorMessage(e));
    } finally {
      setDispatching(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const fmtCurrency = (n: number | null) =>
    n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filteredJobs = jobs.filter((j) => {
    const q = jobSearch.toLowerCase();
    return (
      !q ||
      j.hcp_job_id.toLowerCase().includes(q) ||
      j.customer_name.toLowerCase().includes(q) ||
      j.address.toLowerCase().includes(q)
    );
  });

  const pendingLines = state?.lines.filter((l) => !l.dispatched) ?? [];
  const assignedCount = pendingLines.filter(
    (l) => lineStates[l.parsed_item_row]?.destination
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Dispatch receipt items"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-navy-surface border border-navy-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy-border shrink-0">
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-bold truncate">
              Dispatch Receipt
            </h2>
            {state && (
              <p className="text-xs text-neutral-500 mt-0.5">
                {state.supplier ?? "Unknown Supplier"}
                {state.receipt_date
                  ? ` · ${new Date(state.receipt_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : ""}
                {" · "}
                {fmtCurrency(state.parsed_total)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 ml-4 text-neutral-500 hover:text-cream text-xl leading-none transition"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          )}

          {loadError && (
            <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300">
              {loadError}
            </div>
          )}

          {!loading && state && (
            <>
              {/* Bulk action row */}
              {pendingLines.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2 border-b border-navy-border">
                  <span className="text-xs text-neutral-500 self-center mr-1 shrink-0">Set all to:</span>
                  {jobName && (
                    <button
                      type="button"
                      onClick={() => setAllDest("This Job")}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-900/40 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/60 transition"
                    >
                      This Job
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setAllDest("Truck Stock")}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-900/40 text-blue-300 border border-blue-800/50 hover:bg-blue-900/60 transition"
                  >
                    Truck Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllDest("Warehouse")}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-900/40 text-indigo-300 border border-indigo-800/50 hover:bg-indigo-900/60 transition"
                  >
                    Warehouse
                  </button>
                </div>
              )}

              {/* Line items */}
              <ul className="space-y-3">
                {state.lines.map((line) => (
                  <ReceiptLineRow
                    key={line.parsed_item_row}
                    line={line}
                    lineState={lineStates[line.parsed_item_row] ?? { destination: "", differentJob: "" }}
                    hasJobContext={!!jobName}
                    jobs={filteredJobs}
                    jobSearch={jobSearch}
                    onJobSearch={setJobSearch}
                    onSetDest={(dest) => setLineDest(line.parsed_item_row, dest)}
                    onSetDiffJob={(j) => setLineDiffJob(line.parsed_item_row, j)}
                    fmtCurrency={fmtCurrency}
                  />
                ))}
              </ul>

              {state.lines.length === 0 && (
                <p className="text-neutral-500 text-sm text-center py-6">
                  No parsed items found on this receipt.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && state && (
          <div className="shrink-0 px-5 py-4 border-t border-navy-border space-y-3">
            {dispatchError && (
              <p className="text-sm text-red-400">{dispatchError}</p>
            )}
            {dispatchResult && (
              <p className="text-sm text-emerald-400">{dispatchResult}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-neutral-500">
                {assignedCount} of {pendingLines.length} pending item{pendingLines.length !== 1 ? "s" : ""} assigned
                {state.dispatched_count > 0 ? ` · ${state.dispatched_count} already dispatched` : ""}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-neutral-500 hover:text-cream px-4 py-2 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleDispatch}
                  disabled={dispatching || assignedCount === 0}
                  className="bg-gradient-to-br from-gold-dark to-gold text-navy text-sm font-bold px-5 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-40"
                >
                  {dispatching
                    ? "Dispatching..."
                    : `Dispatch (${assignedCount})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ReceiptLineRow sub-component ──────────────────────────────────────────────

interface ReceiptLineRowProps {
  line: ReceiptDispatchLine;
  lineState: LineState;
  hasJobContext: boolean;
  jobs: JobOption[];
  jobSearch: string;
  onJobSearch: (q: string) => void;
  onSetDest: (dest: ReceiptDispatchDestination | "") => void;
  onSetDiffJob: (jobName: string) => void;
  fmtCurrency: (n: number | null) => string;
}

function ReceiptLineRow({
  line,
  lineState,
  hasJobContext,
  jobs,
  jobSearch,
  onJobSearch,
  onSetDest,
  onSetDiffJob,
  fmtCurrency,
}: ReceiptLineRowProps) {
  const [showJobPicker, setShowJobPicker] = useState(false);

  if (line.dispatched) {
    // Read-only done row
    const dest = line.dispatch_destination;
    return (
      <li className="bg-navy/60 border border-navy-border/50 rounded-xl px-4 py-3 opacity-60">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400 text-xs font-bold border border-emerald-800/50">
            ✓
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-300 leading-snug">
              {line.description || "—"}
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Qty {line.quantity}
              {line.unit_price != null ? ` · ${fmtCurrency(line.unit_price)} each` : ""}
              {line.total_price != null ? ` · ${fmtCurrency(line.total_price)}` : ""}
            </p>
          </div>
          {dest && (
            <span
              className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${DEST_COLORS[dest]}`}
            >
              {dest}
            </span>
          )}
        </div>
      </li>
    );
  }

  // Pending row — full picker
  return (
    <li className="bg-navy border border-navy-border rounded-xl px-4 py-3 space-y-2.5">
      {/* Item info */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-cream leading-snug font-medium">
            {line.description || "—"}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">
            Qty {line.quantity}
            {line.unit_price != null ? ` · ${fmtCurrency(line.unit_price)} each` : ""}
            {line.total_price != null ? ` · ${fmtCurrency(line.total_price)}` : ""}
            {line.product_code ? ` · ${line.product_code}` : ""}
          </p>
        </div>
        {lineState.destination && (
          <span
            className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${DEST_COLORS[lineState.destination as ReceiptDispatchDestination]}`}
          >
            {lineState.destination}
          </span>
        )}
      </div>

      {/* Destination chips */}
      <div className="flex flex-wrap gap-1.5">
        {ALL_DESTINATIONS.filter(
          (d) => d !== "This Job" || hasJobContext
        ).map((dest) => (
          <button
            key={dest}
            type="button"
            onClick={() => {
              onSetDest(lineState.destination === dest ? "" : dest);
              if (dest === "Different Job") {
                setShowJobPicker(lineState.destination !== dest);
              } else {
                setShowJobPicker(false);
              }
            }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
              lineState.destination === dest
                ? DEST_COLORS[dest]
                : "border-navy-border text-neutral-400 hover:text-cream hover:border-neutral-600"
            }`}
          >
            {dest}
          </button>
        ))}
      </div>

      {/* Job picker for "Different Job" */}
      {lineState.destination === "Different Job" && showJobPicker && (
        <div className="pt-1">
          <input
            type="text"
            value={jobSearch}
            onChange={(e) => onJobSearch(e.target.value)}
            placeholder="Search by job #, customer, address..."
            className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-dark transition"
            autoFocus
          />
          {jobs.length > 0 && (
            <ul className="mt-1 bg-navy-surface border border-navy-border rounded-lg max-h-36 overflow-y-auto">
              {jobs.slice(0, 20).map((j) => (
                <li key={j.name}>
                  <button
                    type="button"
                    onClick={() => {
                      onSetDiffJob(j.name);
                      setShowJobPicker(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-navy transition ${
                      lineState.differentJob === j.name ? "text-gold" : "text-cream"
                    }`}
                  >
                    <span className="font-medium">#{j.hcp_job_id}</span>
                    <span className="text-neutral-400 ml-1.5">{j.customer_name}</span>
                    {j.address && (
                      <span className="text-neutral-500 ml-1.5 text-xs">{j.address}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {lineState.differentJob && (
            <p className="text-xs text-gold mt-1.5">
              Selected: {jobs.find((j) => j.name === lineState.differentJob)?.customer_name ?? lineState.differentJob}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
