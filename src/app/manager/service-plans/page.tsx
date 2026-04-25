"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  getPlansList,
  getPlanTemplates,
  createPlanInstance,
  searchCustomers,
  searchAddresses,
  type PlanInstance,
  type PlanTemplate,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

// ── Constants ──────────────────────────────────────────────

const STATUS_FILTERS = ["all", "Draft", "Sent", "Active", "Cancelled"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_BADGE: Record<string, string> = {
  Draft: "bg-neutral-700/60 text-neutral-300",
  Sent: "bg-blue-900/60 text-blue-300",
  Active: "bg-emerald-900/60 text-emerald-300",
  Cancelled: "bg-red-900/60 text-red-300",
};

// ── Helpers ────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-neutral-700/60 text-neutral-300";
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
}

// ── New Plan Modal ─────────────────────────────────────────

function NewPlanModal({
  templates,
  onClose,
  onCreated,
}: {
  templates: PlanTemplate[];
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const router = useRouter();

  const [templateName, setTemplateName] = useState(templates[0]?.name ?? "");
  const [customerInput, setCustomerInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showCustomerSugg, setShowCustomerSugg] = useState(false);
  const customerTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [addressInput, setAddressInput] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSugg, setShowAddressSugg] = useState(false);
  const addressTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTemplate = templates.find((t) => t.name === templateName);

  // Customer typeahead
  const handleCustomerInput = (val: string) => {
    setCustomerInput(val);
    setCustomerName("");
    clearTimeout(customerTimeout.current);
    if (val.trim().length < 2) {
      setCustomerSuggestions([]);
      setShowCustomerSugg(false);
      return;
    }
    customerTimeout.current = setTimeout(async () => {
      try {
        const res = await searchCustomers(val.trim());
        setCustomerSuggestions(res || []);
        setShowCustomerSugg(true);
      } catch {
        setCustomerSuggestions([]);
      }
    }, 250);
  };

  const selectCustomer = (c: any) => {
    setCustomerInput(c.customer_name || c.name);
    setCustomerName(c.name);
    setShowCustomerSugg(false);
    setCustomerSuggestions([]);
  };

  // Address typeahead
  const handleAddressInput = (val: string) => {
    setAddressInput(val);
    clearTimeout(addressTimeout.current);
    if (val.trim().length < 2) {
      setAddressSuggestions([]);
      setShowAddressSugg(false);
      return;
    }
    addressTimeout.current = setTimeout(async () => {
      try {
        const res = await searchAddresses(val.trim());
        setAddressSuggestions(res || []);
        setShowAddressSugg(true);
      } catch {
        setAddressSuggestions([]);
      }
    }, 250);
  };

  const selectAddress = (a: any) => {
    setAddressInput(a.address_line1 || a.name);
    setShowAddressSugg(false);
    setAddressSuggestions([]);
  };

  const handleSubmit = async () => {
    if (!templateName) { setError("Select a plan template."); return; }
    if (!customerName) { setError("Select a customer from the suggestions."); return; }
    if (!addressInput.trim()) { setError("Enter an address."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await createPlanInstance(templateName, customerName, addressInput.trim());
      onCreated(res.name);
      router.push(`/manager/service-plans/${encodeURIComponent(res.name)}`);
    } catch (err: any) {
      setError(err.message || "Could not create plan");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-navy-surface border border-navy-border rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-navy-border">
          <h2 className="text-lg font-serif font-bold text-cream">New Service Plan</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-cream transition p-1 rounded-lg hover:bg-white/5"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Template selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Plan Template
            </label>
            <select
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full bg-navy border border-navy-border rounded-xl px-4 py-2.5 text-sm text-cream focus:outline-none focus:border-gold-dark transition"
            >
              {templates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name_label} — {fmtCurrency(t.price)}/yr ({t.trade})
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="text-xs text-neutral-500 mt-1.5">
                {selectedTemplate.visits_per_year} visit{selectedTemplate.visits_per_year !== 1 ? "s" : ""}/yr &middot;{" "}
                every {selectedTemplate.service_interval_months} months &middot;{" "}
                billed {selectedTemplate.billing_cadence}
              </p>
            )}
          </div>

          {/* Customer */}
          <div className="relative">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Customer
            </label>
            <input
              type="text"
              value={customerInput}
              onChange={(e) => handleCustomerInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowCustomerSugg(false), 150)}
              placeholder="Search customers..."
              className="w-full bg-navy border border-navy-border rounded-xl px-4 py-2.5 text-sm text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
            />
            {customerName && (
              <p className="text-xs text-emerald-400 mt-1">Customer selected</p>
            )}
            {showCustomerSugg && customerSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-navy-surface border border-navy-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {customerSuggestions.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onMouseDown={() => selectCustomer(c)}
                    className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-navy-card/60 transition"
                  >
                    <span className="font-medium">{c.customer_name || c.name}</span>
                    {c.phone && <span className="text-neutral-500 ml-2 text-xs">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Address */}
          <div className="relative">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Service Address
            </label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => handleAddressInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowAddressSugg(false), 150)}
              placeholder="Search or enter address..."
              className="w-full bg-navy border border-navy-border rounded-xl px-4 py-2.5 text-sm text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
            />
            {showAddressSugg && addressSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-navy-surface border border-navy-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {addressSuggestions.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onMouseDown={() => selectAddress(a)}
                    className="w-full text-left px-4 py-2.5 text-sm text-cream hover:bg-navy-card/60 transition"
                  >
                    {a.address_line1 || a.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-2.5 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-neutral-400 hover:text-cream hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-5 py-2.5 rounded-xl text-sm hover:from-gold-light hover:to-gold transition disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "Create Plan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function ServicePlansPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<PlanInstance[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!getAuth()) router.replace("/manager");
  }, [router]);

  // Load templates once
  useEffect(() => {
    getPlanTemplates()
      .then((res) => setTemplates(res.templates || []))
      .catch(() => {});
  }, []);

  const fetchPlans = useCallback(async (filter: StatusFilter, pg: number, append: boolean) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const res = await getPlansList(filter, pg, 30);
      if (append) {
        setPlans((prev) => [...prev, ...res.plans]);
      } else {
        setPlans(res.plans);
      }
      setTotalCount(res.total_count);
      setHasMore(res.has_more);
    } catch (err: any) {
      setError(err.message || "Failed to load service plans");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchPlans(statusFilter, 1, false);
  }, [statusFilter, fetchPlans]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPlans(statusFilter, next, true);
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-cream">Service Plans</h1>
            {!loading && (
              <p className="text-xs text-neutral-500 mt-0.5">
                {totalCount.toLocaleString()} total &middot;{" "}
                <Link
                  href="/manager/service-plans/templates"
                  className="text-gold hover:text-gold-light transition"
                >
                  View Templates
                </Link>
              </p>
            )}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-4 py-2 rounded-lg text-sm hover:from-gold-light hover:to-gold transition"
          >
            + New Plan
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                statusFilter === f
                  ? "bg-gold-dark/30 text-gold border border-gold-dark/60"
                  : "bg-navy-surface border border-navy-border text-neutral-400 hover:text-cream hover:border-neutral-600"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-navy-surface rounded-xl border border-navy-border overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-border">
                      <th className="text-left px-5 py-3 text-xs font-bold text-cream/50 tracking-wider">PLAN</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">CUSTOMER</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">ADDRESS</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">STATUS</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">PRICE/YR</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-cream/50 tracking-wider">NEXT SERVICE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr
                        key={p.name}
                        onClick={() => router.push(`/manager/service-plans/${encodeURIComponent(p.name)}`)}
                        className="border-b border-navy-border/50 hover:bg-navy-card/50 transition cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium text-gold">{p.template_name || p.name}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-cream">{p.customer_name}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm text-neutral-400 truncate max-w-[200px]">{p.address || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-medium text-cream">{fmtCurrency(p.price)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-neutral-500">
                          {fmtDate(p.next_service_date)}
                        </td>
                      </tr>
                    ))}
                    {plans.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                          No service plans found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden divide-y divide-navy-border/50">
                {plans.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => router.push(`/manager/service-plans/${encodeURIComponent(p.name)}`)}
                    className="w-full flex items-start justify-between px-4 py-4 hover:bg-navy-card/50 transition text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gold truncate">{p.template_name || p.name}</p>
                      <p className="text-sm font-medium text-cream truncate mt-0.5">{p.customer_name}</p>
                      {p.address && (
                        <p className="text-xs text-neutral-500 mt-0.5 truncate">{p.address}</p>
                      )}
                      <div className="mt-1.5">
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-medium text-cream">{fmtCurrency(p.price)}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{fmtDate(p.next_service_date)}</p>
                    </div>
                  </button>
                ))}
                {plans.length === 0 && (
                  <p className="px-4 py-12 text-center text-neutral-500">No service plans found</p>
                )}
              </div>
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-navy-surface border border-navy-border text-cream/70 hover:text-cream hover:border-gold-dark px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* New Plan Modal */}
      {showModal && templates.length > 0 && (
        <NewPlanModal
          templates={templates}
          onClose={() => setShowModal(false)}
          onCreated={() => setShowModal(false)}
        />
      )}
      {showModal && templates.length === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-navy-surface border border-navy-border rounded-2xl p-8 max-w-sm text-center">
            <p className="text-neutral-400 mb-4">No plan templates found. Create templates first.</p>
            <Link
              href="/manager/service-plans/templates"
              className="text-gold hover:text-gold-light transition text-sm"
            >
              View Templates
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
