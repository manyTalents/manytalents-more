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
} from "@/lib/frappe";

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

// Workflow action config per status
const WORKFLOW_ACTIONS: Record<
  string,
  Array<{
    label: string;
    action: (jobName: string) => Promise<any>;
    color: string;
    confirm?: string;
  }>
> = {
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
  ],
  Checked: [
    {
      label: "Create Invoice",
      action: (name) => createInvoiceForJob(name, false),
      color: "from-gold to-gold-dark",
      confirm: "Create a Sales Invoice for this job?",
    },
    {
      label: "Create & Email Invoice",
      action: (name) => createInvoiceForJob(name, true),
      color: "from-gold to-gold-dark",
      confirm: "Create and email the invoice to the customer?",
    },
  ],
  Invoiced: [
    {
      label: "Mark Paid",
      action: markPaid,
      color: "from-emerald-600 to-emerald-700",
      confirm: "Mark this job as paid?",
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
  }, [jobName, router]);

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
      setActionResult(
        res?.sales_invoice
          ? `Invoice ${res.sales_invoice} created${res.emailed ? " and emailed" : ""}`
          : `Status updated to ${res?.status || "success"}`
      );
      loadJob();
    } catch (err: any) {
      setError(err.message || "Action failed");
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
      {/* Nav */}
      <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/manager/jobs"
            className="text-neutral-400 hover:text-gold-light transition"
          >
            ← All Jobs
          </Link>
          <div className="h-5 w-px bg-navy-border" />
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-lg font-bold truncate">
              {job.customer_name || "Unknown Customer"}
            </h1>
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
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Action result / error */}
        {actionResult && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-4 py-3 text-sm text-emerald-300">
            {actionResult}
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
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleAction(a.action, a.confirm)}
                  disabled={acting}
                  className={`bg-gradient-to-br ${a.color} text-white font-bold px-6 py-3 rounded-lg hover:opacity-90 transition disabled:opacity-60`}
                >
                  {acting ? "Processing..." : a.label}
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
    </div>
  );
}
