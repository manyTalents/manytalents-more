"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  getJobDetail,
  sendToCheck,
  approveForInvoice,
  createInvoiceForJob,
  markInvoiced,
  markPaid,
  revertWithNote,
  updateJobServices,
  getDefaultLaborRate,
  getEstimateList,
  type EstimateSummary,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

const STATUS_COLORS: Record<string, string> = {
  Entered: "bg-neutral-700 text-neutral-300",
  Scheduled: "bg-blue-900/60 text-blue-300",
  Assigned: "bg-indigo-900/60 text-indigo-300",
  "In Progress": "bg-cyan-900/60 text-cyan-300",
  "On Hold": "bg-amber-900/60 text-amber-300",
  Completed: "bg-orange-900/60 text-orange-300",
  "Needs Check": "bg-purple-900/60 text-purple-300",
  Checked: "bg-blue-900/60 text-blue-300",
  Invoiced: "bg-amber-900/60 text-amber-300",
  Paid: "bg-emerald-900/60 text-emerald-300",
  Canceled: "bg-red-900/60 text-red-300",
};

// Create invoice then auto-mark as Invoiced
async function createAndMarkInvoiced(jobName: string, sendEmail: boolean) {
  const res = await createInvoiceForJob(jobName, sendEmail);
  await markInvoiced(jobName);
  return res;
}

// Workflow action config per status
interface WorkflowAction {
  label: string;
  action: (jobName: string) => Promise<any>;
  color: string;
  confirm?: string;
  secondary?: boolean;
  sendBack?: string; // target status — triggers note popup instead of direct action
}

const WORKFLOW_ACTIONS: Record<string, WorkflowAction[]> = {
  Completed: [
    {
      label: "Send to Check",
      action: sendToCheck,
      color: "from-purple-600 to-purple-700",
    },
  ],
  "Needs Check": [
    {
      label: "Approve for Invoice",
      action: approveForInvoice,
      color: "from-blue-600 to-blue-700",
    },
    {
      label: "Send Back",
      action: () => Promise.resolve(),
      color: "from-neutral-600 to-neutral-700",
      secondary: true,
      sendBack: "Completed",
    },
  ],
  Checked: [
    {
      label: "Create Invoice",
      action: (name) => createAndMarkInvoiced(name, false),
      color: "from-gold to-gold-dark",
      confirm: "Create a Sales Invoice for this job?",
    },
    {
      label: "Create & Email Invoice",
      action: (name) => createAndMarkInvoiced(name, true),
      color: "from-gold to-gold-dark",
      confirm: "Create and email the invoice to the customer?",
    },
    {
      label: "Send Back",
      action: () => Promise.resolve(),
      color: "from-neutral-600 to-neutral-700",
      secondary: true,
      sendBack: "Needs Check",
    },
  ],
  Invoiced: [
    {
      label: "Mark Paid",
      action: markPaid,
      color: "from-emerald-600 to-emerald-700",
      confirm: "Mark this job as paid?",
    },
    {
      label: "Send Back",
      action: () => Promise.resolve(),
      color: "from-neutral-600 to-neutral-700",
      secondary: true,
      sendBack: "Checked",
    },
  ],
};

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobName = params.name as string;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionResult, setActionResult] = useState("");
  const [error, setError] = useState("");

  // Editable services state
  const [editingServices, setEditingServices] = useState(false);
  const [serviceRows, setServiceRows] = useState<
    Array<{ description: string; qty: string; rate: string }>
  >([]);
  const [savingServices, setSavingServices] = useState(false);
  const [defaultRate, setDefaultRate] = useState(155);
  const [invoiceInfo, setInvoiceInfo] = useState<{ name: string; url: string } | null>(null);

  // Linked estimates
  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [estimatesLoading, setEstimatesLoading] = useState(true);

  // Send-back modal
  const [sendBackTarget, setSendBackTarget] = useState<string | null>(null);
  const [sendBackNote, setSendBackNote] = useState("");

  const loadJob = () => {
    setLoading(true);
    getJobDetail(jobName)
      .then((data: any) => setJob(data))
      .catch((err) => setError(err.message || "Failed to load job"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    loadJob();
    getDefaultLaborRate()
      .then((res) => setDefaultRate(res.rate))
      .catch(() => {});
    getEstimateList("all", 1, 50)
      .then((res) => {
        const linked = (res.estimates ?? []).filter(
          (e) => e.linked_job === jobName
        );
        setEstimates(linked);
      })
      .catch(() => {})
      .finally(() => setEstimatesLoading(false));
  }, [jobName, router]);

  const startEditingServices = () => {
    const rows =
      job.services && job.services.length > 0
        ? job.services.map((s: any) => ({
            description: s.description || "",
            qty: String(s.qty || ""),
            rate: String(s.rate || ""),
          }))
        : [{ description: "Labor", qty: "", rate: String(defaultRate) }];
    setServiceRows(rows);
    setEditingServices(true);
  };

  const addServiceRow = () => {
    setServiceRows([
      ...serviceRows,
      { description: "Labor", qty: "", rate: String(defaultRate) },
    ]);
  };

  const removeServiceRow = (idx: number) => {
    setServiceRows(serviceRows.filter((_, i) => i !== idx));
  };

  const updateServiceRow = (
    idx: number,
    field: "description" | "qty" | "rate",
    value: string
  ) => {
    const updated = [...serviceRows];
    updated[idx] = { ...updated[idx], [field]: value };
    setServiceRows(updated);
  };

  const saveServices = async () => {
    setSavingServices(true);
    setError("");
    try {
      const cleaned = serviceRows
        .filter((r) => parseFloat(r.qty) > 0 || parseFloat(r.rate) > 0)
        .map((r) => ({
          description: r.description || "Labor",
          qty: parseFloat(r.qty) || 0,
          rate: parseFloat(r.rate) || 0,
        }));
      await updateJobServices(jobName, cleaned);
      setEditingServices(false);
      setActionResult("Services updated");
      loadJob();
    } catch (err: any) {
      setError(err.message || "Could not save services");
    } finally {
      setSavingServices(false);
    }
  };

  const handleAction = async (
    action: (name: string) => Promise<any>,
    confirmMsg?: string
  ) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActing(true);
    setActionResult("");
    setError("");
    try {
      const res = await action(jobName);
      if (res?.sales_invoice) {
        const creds = getAuth();
        const siteUrl = creds?.siteUrl || "https://manytalentsmore.v.frappe.cloud";
        setInvoiceInfo({
          name: res.sales_invoice,
          url: `${siteUrl}/app/sales-invoice/${res.sales_invoice}`,
        });
        setActionResult(
          `Invoice ${res.sales_invoice} created${res.emailed ? " and emailed" : ""}`
        );
      } else {
        setActionResult(`Status updated to ${res?.status || "success"}`);
      }
      loadJob();
    } catch (err: any) {
      setError(err.message || "Action failed");
    } finally {
      setActing(false);
    }
  };

  const handleSendBack = async () => {
    if (!sendBackTarget) return;
    if (!sendBackNote.trim()) {
      setError("Please add a note explaining why this is being sent back.");
      return;
    }
    setActing(true);
    setError("");
    setActionResult("");
    try {
      await revertWithNote(jobName, sendBackTarget, sendBackNote);
      setActionResult(`Sent back to ${sendBackTarget}`);
      setSendBackTarget(null);
      setSendBackNote("");
      loadJob();
    } catch (err: any) {
      setError(err.message || "Send back failed");
    } finally {
      setActing(false);
    }
  };

  const fmtCurrency = (n: number) =>
    `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-300">{error}</p>
          <Link href="/manager/jobs" className="text-gold text-sm mt-4 inline-block">
            ← Back to all jobs
          </Link>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const actions = WORKFLOW_ACTIONS[job.status] || [];

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Job sub-header */}
      <div className="border-b border-navy-border bg-navy-surface/40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-lg font-bold truncate">
              {job.customer_name || "Unknown Customer"}
            </h2>
            <p className="text-xs text-neutral-500">
              #{job.hcp_job_id} · {job.name}
            </p>
          </div>
          <span
            className={`text-sm px-3 py-1 rounded-full font-medium ${
              STATUS_COLORS[job.status] || "bg-neutral-700 text-neutral-300"
            }`}
          >
            {job.status}
          </span>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Action result / error */}
        {actionResult && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-4 py-3 text-sm text-emerald-300">
            {actionResult}
            {invoiceInfo && (
              <a
                href={invoiceInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 underline text-gold hover:text-gold-light"
              >
                View {invoiceInfo.name} in ERPNext
              </a>
            )}
          </div>
        )}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Workflow actions */}
        {actions.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
              Workflow Actions
            </p>
            <div className="flex flex-wrap gap-3">
              {actions.filter(a => !a.secondary).map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(a.action, a.confirm)}
                  disabled={acting}
                  className={`bg-gradient-to-br ${a.color} text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-60`}
                >
                  {acting ? "Processing..." : a.label}
                </button>
              ))}
              {actions.filter(a => a.secondary).map((a, i) => (
                <button
                  key={`s${i}`}
                  onClick={() => {
                    if (a.sendBack) {
                      setSendBackTarget(a.sendBack);
                      setSendBackNote("");
                      setError("");
                    } else {
                      handleAction(a.action, a.confirm);
                    }
                  }}
                  disabled={acting}
                  className="text-sm text-neutral-500 hover:text-cream border border-navy-border px-4 py-2 rounded-lg transition disabled:opacity-60"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Job info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left — customer & location */}
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 space-y-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Customer & Location
            </p>
            <div>
              <p className="text-lg font-serif font-bold">
                {job.customer_name || "Unknown"}
              </p>
              {job.customer_phone && (
                <a
                  href={`tel:${job.customer_phone}`}
                  className="text-sm text-gold hover:text-gold-light"
                >
                  {job.customer_phone}
                </a>
              )}
            </div>
            <div>
              <p className="text-sm text-neutral-300">
                {job.address}
                {job.town ? `, ${job.town}` : ""}
              </p>
            </div>
            {(job.occupant_name || job.occupant_phone) && (
              <div className="pt-3 border-t border-navy-border">
                <p className="text-xs text-neutral-500 mb-1">Occupant</p>
                {job.occupant_name && (
                  <p className="text-sm text-neutral-300">{job.occupant_name}</p>
                )}
                {job.occupant_phone && (
                  <a
                    href={`tel:${job.occupant_phone}`}
                    className="text-sm text-gold hover:text-gold-light"
                  >
                    {job.occupant_phone}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Right — financials */}
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 space-y-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Financials
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-500">Total Job Cost</p>
                <p className="text-2xl font-serif font-bold text-gold-gradient">
                  {fmtCurrency(job.total_job_cost)}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Service Cost</p>
                <p className="text-xl font-serif font-bold">
                  {fmtCurrency(job.total_service_cost)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-navy-border">
              <div>
                <p className="text-xs text-neutral-500">Scheduled</p>
                <p className="text-sm text-neutral-300">
                  {job.scheduled_date || "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Type</p>
                <p className="text-sm text-neutral-300">
                  {job.job_type || "—"}
                  {job.is_estimate ? " (Estimate)" : ""}
                </p>
              </div>
            </div>
            {job.urgent_fee > 0 && (
              <div className="pt-3 border-t border-navy-border">
                <p className="text-xs text-neutral-500">Urgent Fee</p>
                <p className="text-sm text-amber-300">{fmtCurrency(job.urgent_fee)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {(job.description || job.job_description) && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-3">
              Description
            </p>
            {job.job_description && (
              <p className="text-sm text-neutral-300 leading-relaxed mb-3">
                {job.job_description}
              </p>
            )}
            {job.description && job.description !== job.job_description && (
              <p className="text-sm text-neutral-400 leading-relaxed">
                {job.description}
              </p>
            )}
          </div>
        )}

        {/* Services (editable) */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Services / Labor
            </p>
            {!editingServices ? (
              <button
                onClick={startEditingServices}
                className="text-xs text-gold hover:text-gold-light transition"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingServices(false)}
                  className="text-xs text-neutral-500 hover:text-cream transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveServices}
                  disabled={savingServices}
                  className="text-xs bg-gold-dark text-navy font-bold px-3 py-1 rounded transition disabled:opacity-60"
                >
                  {savingServices ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>

          {editingServices ? (
            <div className="space-y-3">
              {serviceRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {idx === 0 && (
                      <label className="block text-xs text-neutral-500 mb-1">
                        Description
                      </label>
                    )}
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        updateServiceRow(idx, "description", e.target.value)
                      }
                      className="w-full bg-navy border border-navy-border rounded px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-dark"
                    />
                  </div>
                  <div className="w-20">
                    {idx === 0 && (
                      <label className="block text-xs text-neutral-500 mb-1">
                        Hours
                      </label>
                    )}
                    <input
                      type="number"
                      step="0.5"
                      value={row.qty}
                      onChange={(e) =>
                        updateServiceRow(idx, "qty", e.target.value)
                      }
                      className="w-full bg-navy border border-navy-border rounded px-3 py-2 text-sm text-cream text-right focus:outline-none focus:border-gold-dark"
                    />
                  </div>
                  <div className="w-24">
                    {idx === 0 && (
                      <label className="block text-xs text-neutral-500 mb-1">
                        Rate
                      </label>
                    )}
                    <input
                      type="number"
                      step="1"
                      value={row.rate}
                      onChange={(e) =>
                        updateServiceRow(idx, "rate", e.target.value)
                      }
                      className="w-full bg-navy border border-navy-border rounded px-3 py-2 text-sm text-cream text-right focus:outline-none focus:border-gold-dark"
                    />
                  </div>
                  <div className="w-24 text-right">
                    {idx === 0 && (
                      <label className="block text-xs text-neutral-500 mb-1">
                        Total
                      </label>
                    )}
                    <p className="py-2 text-sm text-gold font-medium">
                      $
                      {(
                        (parseFloat(row.qty) || 0) *
                        (parseFloat(row.rate) || 0)
                      ).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeServiceRow(idx)}
                    className="text-neutral-600 hover:text-red-400 text-lg pb-1"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={addServiceRow}
                className="text-xs text-gold hover:text-gold-light transition"
              >
                + Add service line
              </button>
            </div>
          ) : job.services && job.services.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-500 uppercase border-b border-navy-border">
                    <th className="text-left py-2 pr-4">Description</th>
                    <th className="text-right py-2 px-4">Hrs</th>
                    <th className="text-right py-2 px-4">Rate</th>
                    <th className="text-right py-2 pl-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {job.services.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-navy-border/50">
                      <td className="py-2 pr-4 text-neutral-300">
                        {s.description || s.item_name || "Labor"}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-400">
                        {s.qty}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-400">
                        ${fmtCurrency(s.rate).replace("$", "")}
                      </td>
                      <td className="py-2 pl-4 text-right text-gold font-medium">
                        {fmtCurrency(s.amount || s.qty * s.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">
              No services added yet.{" "}
              <button
                onClick={startEditingServices}
                className="text-gold hover:text-gold-light"
              >
                Add labor
              </button>
            </p>
          )}
        </div>

        {/* Assigned techs */}
        {job.assigned_techs && job.assigned_techs.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-3">
              Assigned Techs
            </p>
            <div className="flex flex-wrap gap-3">
              {job.assigned_techs.map((t: any, i: number) => (
                <div
                  key={i}
                  className="bg-navy border border-navy-border rounded-lg px-4 py-3"
                >
                  <p className="text-sm font-medium text-cream">{t.tech_name}</p>
                  <p className="text-xs text-neutral-500">
                    {t.role || "Tech"}
                    {t.van_warehouse ? ` · ${t.van_warehouse}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materials */}
        {job.materials && job.materials.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-3">
              Materials ({job.materials.length})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-500 uppercase border-b border-navy-border">
                    <th className="text-left py-2 pr-4">Item</th>
                    <th className="text-right py-2 px-4">Qty</th>
                    <th className="text-right py-2 px-4">Rate</th>
                    <th className="text-right py-2 pl-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {job.materials.map((m: any, i: number) => (
                    <tr key={i} className="border-b border-navy-border/50">
                      <td className="py-2 pr-4 text-neutral-300">
                        {m.item_name || m.item_code || "Unknown"}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-400">
                        {m.qty}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-400">
                        {fmtCurrency(m.rate)}
                      </td>
                      <td className="py-2 pl-4 text-right text-cream font-medium">
                        {fmtCurrency(m.amount || m.qty * m.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estimates */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Estimates
            </p>
            <button
              onClick={() => router.push(`/manager/estimates/new?job=${job.name}`)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition"
            >
              + Create Estimate
            </button>
          </div>
          {estimatesLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : estimates.length === 0 ? (
            <p className="text-neutral-500 text-sm">No estimates linked to this job.</p>
          ) : (
            <ul className="divide-y divide-navy-border">
              {estimates.map((est) => (
                <li key={est.name}>
                  <button
                    onClick={() => router.push(`/manager/estimates/${est.name}`)}
                    className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-navy/50 transition-colors rounded px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                    aria-label={`Estimate ${est.estimate_number}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-mono text-cream/70 flex-shrink-0">
                        #{est.estimate_number}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          est.status === "Approved"
                            ? "bg-emerald-900/60 text-emerald-300"
                            : est.status === "Sent"
                            ? "bg-blue-900/60 text-blue-300"
                            : est.status === "Declined"
                            ? "bg-red-900/60 text-red-300"
                            : est.status === "Expired"
                            ? "bg-neutral-700 text-neutral-400"
                            : "bg-amber-900/60 text-amber-300"
                        }`}
                      >
                        {est.status}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gold flex-shrink-0">
                      ${(est.total || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Receipts */}
        {job.receipts && job.receipts.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-3">
              Receipts ({job.receipts.length})
            </p>
            <div className="space-y-2">
              {job.receipts.map((r: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-navy border border-navy-border rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-cream">
                      {r.supplier || "Unknown Supplier"}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {r.ocr_status || "pending"}
                      {r.parsed_po_number ? ` · PO: ${r.parsed_po_number}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gold">
                    {r.parsed_total ? fmtCurrency(r.parsed_total) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Send-back modal */}
      {sendBackTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-serif text-lg font-bold mb-1">Send Back to {sendBackTarget}</h3>
            <p className="text-sm text-neutral-500 mb-4">
              What needs to be fixed? This note will be saved on the job.
            </p>
            <textarea
              value={sendBackNote}
              onChange={(e) => setSendBackNote(e.target.value)}
              placeholder="e.g. Missing labor description, wrong address, need receipt for materials..."
              rows={3}
              autoFocus
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream text-sm focus:outline-none focus:border-gold-dark transition resize-none mb-4"
            />
            {error && (
              <p className="text-red-400 text-sm mb-3">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setSendBackTarget(null); setError(""); }}
                className="text-sm text-neutral-500 hover:text-cream px-4 py-2 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBack}
                disabled={acting}
                className="bg-gradient-to-br from-amber-600 to-amber-700 text-white font-bold px-5 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-60"
              >
                {acting ? "Sending..." : "Send Back"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
