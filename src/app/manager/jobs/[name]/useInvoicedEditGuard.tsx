"use client";

/**
 * useInvoicedEditGuard
 *
 * Provides a reusable mechanism for requiring a "reason for change" before
 * any edit action on a job whose status is "Invoiced".
 *
 * Usage:
 *   const { guardedAction, GuardModal } = useInvoicedEditGuard(job?.status);
 *
 *   // In a save handler:
 *   guardedAction(async (reason) => {
 *     await updateJobServices(jobName, rows, reason);
 *   });
 *
 *   // In JSX:
 *   <GuardModal />
 */

import { useState, useCallback, useRef } from "react";

/** Receives the typed reason (or undefined when job is not Invoiced). */
type ActionWithReason = (changeReason: string | undefined) => Promise<void>;

interface GuardState {
  open: boolean;
  reason: string;
  error: string;
  submitting: boolean;
}

export function useInvoicedEditGuard(jobStatus: string | undefined) {
  const [state, setState] = useState<GuardState>({
    open: false,
    reason: "",
    error: "",
    submitting: false,
  });

  const isInvoiced = jobStatus === "Invoiced";

  /**
   * Pending action is stored in a ref so it survives re-renders without
   * being captured in stale closures.
   */
  const pendingRef = useRef<ActionWithReason | null>(null);

  /**
   * guardedAction — wrap any async save handler.
   *
   * If the job is Invoiced: opens the reason modal. The action is called
   * with the typed reason once the user confirms.
   *
   * If not Invoiced: calls the action immediately with `undefined`.
   */
  const guardedAction = useCallback(
    (action: ActionWithReason) => {
      if (!isInvoiced) {
        action(undefined);
        return;
      }
      pendingRef.current = action;
      setState({ open: true, reason: "", error: "", submitting: false });
    },
    [isInvoiced]
  );

  const handleConfirm = useCallback(async () => {
    if (!state.reason.trim()) {
      setState((s) => ({ ...s, error: "Please enter a reason before saving." }));
      return;
    }
    const action = pendingRef.current;
    if (!action) return;

    setState((s) => ({ ...s, submitting: true, error: "" }));
    try {
      await action(state.reason.trim());
      // Success — close modal and reset
      pendingRef.current = null;
      setState({ open: false, reason: "", error: "", submitting: false });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Edit failed — please try again.";
      setState((s) => ({ ...s, submitting: false, error: msg }));
    }
  }, [state.reason]);

  const handleCancel = useCallback(() => {
    pendingRef.current = null;
    setState({ open: false, reason: "", error: "", submitting: false });
  }, []);

  const setReason = useCallback((val: string) => {
    setState((s) => ({ ...s, reason: val, error: "" }));
  }, []);

  /** Render this once in the page — invisible when not open. */
  const GuardModal = useCallback(
    function InvoicedEditGuardModal() {
      if (!state.open) return null;
      return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-serif text-lg font-bold mb-1 text-cream">
              Reason for Change
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              This job has already been invoiced. Briefly describe why you are
              making this edit — it will be logged on the job.
            </p>
            <textarea
              value={state.reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer requested additional labor hour, corrected material quantity..."
              rows={3}
              autoFocus
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream text-sm focus:outline-none focus:border-gold-dark transition resize-none mb-3"
            />
            {state.error && (
              <p className="text-red-400 text-sm mb-3">{state.error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                disabled={state.submitting}
                className="text-sm text-neutral-500 hover:text-cream px-4 py-2 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={state.submitting || !state.reason.trim()}
                className="bg-gradient-to-br from-amber-600 to-amber-700 text-white font-bold px-5 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-60 text-sm"
              >
                {state.submitting ? "Saving..." : "Save with Reason"}
              </button>
            </div>
          </div>
        </div>
      );
    },
    [state, handleCancel, handleConfirm, setReason]
  );

  return { guardedAction, GuardModal, isInvoiced };
}
