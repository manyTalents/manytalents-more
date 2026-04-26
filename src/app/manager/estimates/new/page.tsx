"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuth, searchCustomers, getCustomerHistory, createEstimate, sendEstimate } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

// ── Types ──────────────────────────────────────────────────

interface LineItem {
  id: string;
  description: string;
  qty: string;
  rate: string;
}

interface OptionDraft {
  id: string;
  name_label: string;
  line_items: LineItem[];
}

function makeLineItem(): LineItem {
  return { id: crypto.randomUUID(), description: "", qty: "1", rate: "" };
}

function makeOption(index: number): OptionDraft {
  return {
    id: crypto.randomUUID(),
    name_label: index === 0 ? "Option 1" : `Option ${index + 1}`,
    line_items: [makeLineItem()],
  };
}

function optionTotal(opt: OptionDraft): number {
  return opt.line_items.reduce((sum, li) => {
    const qty = parseFloat(li.qty) || 0;
    const rate = parseFloat(li.rate) || 0;
    return sum + qty * rate;
  }, 0);
}

const fmtCurrency = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Inner (needs searchParams) ────────────────────────────

function NewEstimateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobParam = searchParams.get("job") || "";

  // Customer
  const [customerInput, setCustomerInput] = useState("");
  const [customerName, setCustomerName] = useState(""); // Frappe doc name
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fields
  const [address, setAddress] = useState("");
  const [linkedJob] = useState(jobParam);
  const [approvalMode, setApprovalMode] = useState<"single" | "multiple">("single");
  const [notes, setNotes] = useState("");

  // Options builder
  const [options, setOptions] = useState<OptionDraft[]>([makeOption(0)]);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<"draft" | "send">("draft");
  const [error, setError] = useState("");

  // Confirmation modal for Send
  const [showSendModal, setShowSendModal] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!getAuth()) { router.replace("/manager"); return; }
  }, [router]);

  // ── Customer search ──
  const handleCustomerSearch = (value: string) => {
    setCustomerInput(value);
    setCustomerName("");
    if (customerTimeout.current) clearTimeout(customerTimeout.current);
    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    customerTimeout.current = setTimeout(async () => {
      try {
        const res = await searchCustomers(value);
        setSuggestions(res || []);
        setShowSuggestions((res || []).length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectCustomer = async (cust: any) => {
    setCustomerInput(cust.customer_name);
    setCustomerName(cust.name);
    setShowSuggestions(false);
    setSuggestions([]);
    // Auto-fill address from history
    try {
      const history = await getCustomerHistory(cust.customer_name);
      if (history?.top_address && !address) setAddress(history.top_address);
    } catch {}
  };

  // ── Options builder helpers ──
  const addOption = () => {
    setOptions((prev) => [...prev, makeOption(prev.length)]);
  };

  const removeOption = (id: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOptionName = (id: string, value: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, name_label: value } : o))
    );
  };

  const addLineItem = (optId: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optId ? { ...o, line_items: [...o.line_items, makeLineItem()] } : o
      )
    );
  };

  const removeLineItem = (optId: string, liId: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optId
          ? { ...o, line_items: o.line_items.filter((li) => li.id !== liId) }
          : o
      )
    );
  };

  const updateLineItem = (optId: string, liId: string, field: keyof LineItem, value: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optId
          ? {
              ...o,
              line_items: o.line_items.map((li) =>
                li.id === liId ? { ...li, [field]: value } : li
              ),
            }
          : o
      )
    );
  };

  // ── Submit ──
  const buildOptionsJson = () => {
    return JSON.stringify(
      options.map((opt, idx) => ({
        option_index: idx,
        name_label: opt.name_label,
        line_items: opt.line_items.map((li) => ({
          description: li.description,
          qty: parseFloat(li.qty) || 0,
          rate: parseFloat(li.rate) || 0,
          amount: (parseFloat(li.qty) || 0) * (parseFloat(li.rate) || 0),
        })),
      }))
    );
  };

  const validate = () => {
    if (!customerName && !customerInput.trim()) {
      setError("Customer is required");
      return false;
    }
    for (const opt of options) {
      if (!opt.name_label.trim()) {
        setError("Each option must have a name");
        return false;
      }
      for (const li of opt.line_items) {
        if (!li.description.trim()) {
          setError("All line items must have a description");
          return false;
        }
        if ((parseFloat(li.qty) || 0) <= 0) {
          setError(`Line item "${li.description || "(no description)"}" in "${opt.name_label}" has invalid quantity. Qty must be greater than 0.`);
          return false;
        }
        if ((parseFloat(li.rate) || 0) <= 0) {
          setError(`Line item "${li.description || "(no description)"}" in "${opt.name_label}" has a $0 rate. Rate must be greater than 0.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSaveAsDraft = async () => {
    setError("");
    if (!validate()) return;
    setSubmitAction("draft");
    setSubmitting(true);
    try {
      const res = await createEstimate({
        customer: customerName || customerInput.trim(),
        address: address.trim(),
        linked_job: linkedJob || undefined,
        options_json: buildOptionsJson(),
        approval_mode: approvalMode === "single" ? "Single" : "Multiple",
        notes: notes.trim(),
      });
      router.push(`/manager/estimates/${encodeURIComponent(res.name)}`);
    } catch (err: any) {
      setError(err.message || "Could not create estimate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAndSend = () => {
    setError("");
    if (!validate()) return;
    setShowSendModal(true);
  };

  const confirmSend = async () => {
    setShowSendModal(false);
    setSubmitAction("send");
    setSubmitting(true);
    try {
      const created = await createEstimate({
        customer: customerName || customerInput.trim(),
        address: address.trim(),
        linked_job: linkedJob || undefined,
        options_json: buildOptionsJson(),
        approval_mode: approvalMode === "single" ? "Single" : "Multiple",
        notes: notes.trim(),
      });
      await sendEstimate(created.name);
      router.push(`/manager/estimates/${encodeURIComponent(created.name)}`);
    } catch (err: any) {
      setError(err.message || "Could not send estimate");
    } finally {
      setSubmitting(false);
    }
  };

  const grandTotal = options.reduce((sum, o) => sum + optionTotal(o), 0);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-cream">New Estimate</h1>
          <p className="text-xs text-neutral-500 mt-1">
            Build a structured estimate with one or more pricing options.
          </p>
        </div>

        {/* Customer */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Customer</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative sm:col-span-2 md:col-span-1">
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Customer *
              </label>
              <input
                type="text"
                value={customerInput}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search customer name..."
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
              />
              {showSuggestions && (
                <div className="absolute z-20 top-full mt-1 w-full bg-navy-surface border border-navy-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {suggestions.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onMouseDown={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-navy transition border-b border-navy-border/50 last:border-0"
                    >
                      {c.customer_name}
                    </button>
                  ))}
                </div>
              )}
              {customerName && (
                <p className="text-xs text-emerald-500 mt-1">Customer matched</p>
              )}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
              />
            </div>

            {linkedJob && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                  Linked Job
                </label>
                <div className="bg-navy border border-navy-border rounded-lg px-4 py-3 text-neutral-300 text-sm font-mono">
                  {linkedJob}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Estimate Settings</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">
                Approval Mode
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setApprovalMode("single")}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition ${
                    approvalMode === "single"
                      ? "border-gold-dark bg-gold-dark/10 text-gold"
                      : "border-navy-border bg-navy text-neutral-400 hover:border-neutral-600 hover:text-cream"
                  }`}
                >
                  Single Option
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalMode("multiple")}
                  className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition ${
                    approvalMode === "multiple"
                      ? "border-gold-dark bg-gold-dark/10 text-gold"
                      : "border-navy-border bg-navy text-neutral-400 hover:border-neutral-600 hover:text-cream"
                  }`}
                >
                  Multiple Options
                </button>
              </div>
              <p className="text-xs text-neutral-600 mt-2">
                {approvalMode === "single"
                  ? "Customer approves or declines the whole estimate."
                  : "Customer can approve individual options independently."}
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
                Notes (internal)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes — not shown to customer..."
                rows={2}
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream text-sm placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Options Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Pricing Options ({options.length})
            </p>
            <button
              type="button"
              onClick={addOption}
              className="text-xs font-semibold text-gold hover:text-gold-light transition"
            >
              + Add Option
            </button>
          </div>

          {options.map((opt, optIdx) => {
            const total = optionTotal(opt);
            return (
              <div
                key={opt.id}
                className="bg-navy-surface border border-navy-border rounded-2xl p-6 space-y-4"
              >
                {/* Option header */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-600 font-mono w-5 flex-shrink-0">
                    {optIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={opt.name_label}
                    onChange={(e) => updateOptionName(opt.id, e.target.value)}
                    placeholder="Option name (e.g. 14 SEER AC Replacement)"
                    className="flex-1 bg-navy border border-navy-border rounded-lg px-4 py-2.5 text-cream text-sm font-medium placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(opt.id)}
                      className="p-2 text-neutral-600 hover:text-red-400 transition rounded-lg hover:bg-red-950/20"
                      title="Remove option"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Line items table header */}
                <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wider text-neutral-500 px-1">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Rate</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>

                {/* Line items */}
                <div className="space-y-2">
                  {opt.line_items.map((li) => {
                    const amount = (parseFloat(li.qty) || 0) * (parseFloat(li.rate) || 0);
                    return (
                      <div key={li.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6">
                          <input
                            type="text"
                            value={li.description}
                            onChange={(e) => updateLineItem(opt.id, li.id, "description", e.target.value)}
                            placeholder="Service or part description"
                            className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-cream text-sm placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={li.qty}
                            onChange={(e) => updateLineItem(opt.id, li.id, "qty", e.target.value)}
                            className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-cream text-sm text-center focus:outline-none focus:border-gold-dark transition"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={li.rate}
                            onChange={(e) => updateLineItem(opt.id, li.id, "rate", e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-cream text-sm text-right focus:outline-none focus:border-gold-dark transition"
                          />
                        </div>
                        <div className="col-span-1 text-right text-sm font-medium text-cream">
                          {fmtCurrency(amount)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {opt.line_items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(opt.id, li.id)}
                              className="p-1 text-neutral-600 hover:text-red-400 transition"
                              title="Remove line"
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add line + subtotal */}
                <div className="flex items-center justify-between pt-2 border-t border-navy-border">
                  <button
                    type="button"
                    onClick={() => addLineItem(opt.id)}
                    className="text-xs font-semibold text-gold/70 hover:text-gold transition"
                  >
                    + Add Line Item
                  </button>
                  <div className="text-right">
                    <p className="text-xs text-neutral-500">Option Total</p>
                    <p className="text-lg font-serif font-bold text-gold">{fmtCurrency(total)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grand total (shown when multiple options) */}
        {options.length > 1 && (
          <div className="bg-navy-surface border border-navy-border rounded-xl px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-neutral-400">Combined Total</p>
            <p className="text-2xl font-serif font-bold text-gold">{fmtCurrency(grandTotal)}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            type="button"
            onClick={handleSaveAsDraft}
            disabled={submitting}
            className="flex-1 bg-navy-surface border border-navy-border text-cream font-semibold py-3.5 rounded-xl hover:border-gold-dark transition disabled:opacity-60"
          >
            {submitting && submitAction === "draft" ? "Saving..." : "Save as Draft"}
          </button>
          <button
            type="button"
            onClick={handleSaveAndSend}
            disabled={submitting}
            className="flex-1 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3.5 rounded-xl hover:from-gold-light hover:to-gold transition disabled:opacity-60"
          >
            {submitting && submitAction === "send" ? "Sending..." : "Save & Send"}
          </button>
        </div>
      </main>

      {/* Send confirmation modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-serif font-bold text-cream mb-2">Send Estimate?</h2>
            <p className="text-sm text-neutral-400 mb-6">
              This will save the estimate and send the customer an email with their approval link.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 bg-navy border border-navy-border text-neutral-400 font-medium py-3 rounded-lg hover:text-cream hover:border-neutral-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                className="flex-1 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-lg hover:from-gold-light hover:to-gold transition"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page wrapper (Suspense for useSearchParams) ───────────

export default function NewEstimatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      }
    >
      <NewEstimateInner />
    </Suspense>
  );
}
