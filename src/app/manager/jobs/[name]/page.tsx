"use client";

import { useEffect, useRef, useState } from "react";
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
  addJobNote,
  saveJobField,
  searchPricebook,
  addMaterial,
  removeMaterial,
  updateMaterialQty,
  updateMaterialRate,
  getJobChecklist,
  getInvoiceSettings,
  uploadRawFile,
  uploadAndClassifyPhoto,
  syncHcpJob,
  getClockStatus,
  dayClockIn,
  dayClockOut,
  jobClockIn,
  jobClockOut,
  type EstimateSummary,
  type ClockStatusResult,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";
import PaymentPanel from "@/app/manager/components/PaymentPanel";
import { getErrorMessage } from "@/lib/errors";

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
  action: (jobName: string) => Promise<unknown>;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionResult, setActionResult] = useState("");
  const [error, setError] = useState("");

  // Card processing fee — loaded once from MTM Invoice Settings
  const [cardProcessingPct, setCardProcessingPct] = useState(2.7);
  const settingsFetched = useRef(false);

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

  // Editable info fields
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoFields, setInfoFields] = useState<Record<string, string>>({});
  const [savingInfo, setSavingInfo] = useState(false);

  // Editable materials state
  const [editingMaterials, setEditingMaterials] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialSearchResults, setMaterialSearchResults] = useState<Array<{ name: string; item_name: string; standard_rate: number }>>([]);
  const [materialSearching, setMaterialSearching] = useState(false);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [pendingAddQty, setPendingAddQty] = useState("1");

  // Checklist (read-only audit view)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape
  const [checklist, setChecklist] = useState<any>(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState("");
  const [checklistVisible, setChecklistVisible] = useState(false);

  // Notes
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadPhotoError, setUploadPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // HCP sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [syncError, setSyncError] = useState("");

  // Clock state
  const [clockStatus, setClockStatus] = useState<ClockStatusResult | null>(null);
  const [clockStatusLoading, setClockStatusLoading] = useState(false);
  const [jobClocking, setJobClocking] = useState(false);
  const [dayClocking, setDayClocking] = useState(false);
  const [clockError, setClockError] = useState("");

  const loadJob = () => {
    setLoading(true);
    getJobDetail(jobName)
      .then((data: unknown) => setJob(data))
      .catch((err: unknown) => setError(getErrorMessage(err) || "Failed to load job"))
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
    // Fetch card processing pct once per page load
    if (!settingsFetched.current) {
      settingsFetched.current = true;
      getInvoiceSettings()
        .then((s) => setCardProcessingPct(s.card_processing_pct))
        .catch(() => {/* use default 2.7 */});
    }
    // Load clock status for this session
    setClockStatusLoading(true);
    getClockStatus()
      .then((s) => setClockStatus(s))
      .catch(() => {/* non-critical */})
      .finally(() => setClockStatusLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadJob is stable within render; adding it would cause infinite loop
  }, [jobName, router]);

  const startEditingServices = () => {
    const rows =
      job.services && job.services.length > 0
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape
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
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not save services");
    } finally {
      setSavingServices(false);
    }
  };

  const handleAction = async (
    action: (name: string) => Promise<unknown>,
    confirmMsg?: string
  ) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setActing(true);
    setActionResult("");
    setError("");
    try {
      const raw = await action(jobName);
      const res = raw as Record<string, unknown>;
      if (res?.sales_invoice) {
        const creds = getAuth();
        const siteUrl = creds?.siteUrl || "https://erp.manytalentsmore.com";
        setInvoiceInfo({
          name: res.sales_invoice as string,
          url: `${siteUrl}/app/sales-invoice/${res.sales_invoice as string}`,
        });
        setActionResult(
          `Invoice ${res.sales_invoice as string} created${res.emailed ? " and emailed" : ""}`
        );
      } else {
        setActionResult(`Status updated to ${(res?.status as string) || "success"}`);
      }
      loadJob();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Action failed");
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
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Send back failed");
    } finally {
      setActing(false);
    }
  };

  const startEditingInfo = () => {
    setInfoFields({
      customer_name: job.customer_name || "",
      address: job.address || "",
      town: job.town || "",
      description: job.description || "",
      job_type: job.job_type || "",
      priority: job.priority || "",
      occupant_name: job.occupant_name || "",
      occupant_phone: job.occupant_phone || "",
      customer_phone: job.customer_phone || "",
    });
    setEditingInfo(true);
  };

  const saveInfo = async () => {
    setSavingInfo(true);
    setError("");
    try {
      const EDITABLE_FIELDS = [
        "customer_name", "address", "town", "description",
        "job_type", "priority", "occupant_name", "occupant_phone", "customer_phone",
      ];
      const saves = EDITABLE_FIELDS.filter(
        (f) => (infoFields[f] ?? "") !== (job[f] ?? "")
      ).map((f) => saveJobField(jobName, f, infoFields[f]));
      await Promise.all(saves);
      setEditingInfo(false);
      setActionResult("Job info updated");
      loadJob();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not save job info");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    setError("");
    try {
      await addJobNote(jobName, noteText.trim());
      setNoteText("");
      loadJob();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Could not add note");
    } finally {
      setSavingNote(false);
    }
  };

  const fmtCurrency = (n: number) =>
    `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // ── Photo upload handler ─────────────────────────────────
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    setUploadPhotoError("");
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Step 1: upload raw file to Frappe storage
        const fileUrl = await uploadRawFile(file);
        // Step 2: attach + classify against this job
        await uploadAndClassifyPhoto(jobName, fileUrl);
      }
      loadJob();
    } catch (err: unknown) {
      setUploadPhotoError(getErrorMessage(err) || "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      // Reset input so same file can be re-selected if needed
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // ── HCP sync handler ─────────────────────────────────────
  const handleHcpSync = async () => {
    setSyncing(true);
    setSyncResult("");
    setSyncError("");
    try {
      const res = await syncHcpJob(jobName);
      setSyncResult(`Synced at ${new Date(res.synced_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
      loadJob();
    } catch (err: unknown) {
      setSyncError(getErrorMessage(err) || "HCP sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // ── Clock handlers ────────────────────────────────────────
  const handleDayClock = async () => {
    setDayClocking(true);
    setClockError("");
    try {
      if (clockStatus?.clocked_in) {
        await dayClockOut();
        setClockStatus({ clocked_in: false });
      } else {
        const res = await dayClockIn();
        setClockStatus({ clocked_in: true, clock_in_time: res.clock_in_time, timesheet: res.timesheet });
      }
    } catch (err: unknown) {
      setClockError(getErrorMessage(err) || "Clock action failed");
    } finally {
      setDayClocking(false);
    }
  };

  const handleJobClock = async () => {
    const isJobRunning = (job.time_logs || []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape
      (l: any) => l.status === "Running"
    );
    setJobClocking(true);
    setClockError("");
    try {
      if (isJobRunning) {
        await jobClockOut(jobName);
      } else {
        await jobClockIn(jobName);
      }
      loadJob();
    } catch (err: unknown) {
      setClockError(getErrorMessage(err) || "Clock action failed");
    } finally {
      setJobClocking(false);
    }
  };

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

        {/* Payment panel — shown when job has a Sales Invoice ready to collect */}
        {job.status === "Invoiced" && job.sales_invoice && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-5">
              Collect Payment
            </p>
            <PaymentPanel
              invoice={{
                invoice_name: job.sales_invoice as string,
                customer_name: job.customer_name as string,
                customer_email: (job.customer_email as string | undefined) ?? "",
                customer_phone: (job.customer_phone as string | undefined) ?? "",
                amount: (job.grand_total as number | undefined) ?? (job.total_job_cost as number ?? 0),
                card_processing_pct: cardProcessingPct,
              }}
              onPaid={() => {
                setActionResult("Payment recorded — job marked Paid");
                loadJob();
              }}
            />
          </div>
        )}

        {/* Workflow actions — hidden for Invoiced (PaymentPanel handles it) */}
        {actions.length > 0 && job.status !== "Invoiced" && (
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
                      if (!confirm(`Are you sure you want to send this job back to ${a.sendBack}?`)) return;
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
          {/* Left — customer & location (editable) */}
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-neutral-400">
                Customer & Location
              </p>
              {!editingInfo ? (
                <button
                  onClick={startEditingInfo}
                  className="text-xs text-gold hover:text-gold-light transition"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingInfo(false); setError(""); }}
                    className="text-xs text-neutral-500 hover:text-cream transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveInfo}
                    disabled={savingInfo}
                    className="text-xs bg-gold-dark text-navy font-bold px-3 py-1 rounded transition disabled:opacity-60"
                  >
                    {savingInfo ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {editingInfo ? (
              <div className="space-y-3">
                {[
                  { label: "Customer Name", field: "customer_name" },
                  { label: "Customer Phone", field: "customer_phone" },
                  { label: "Address", field: "address" },
                  { label: "Town", field: "town" },
                  { label: "Job Type", field: "job_type" },
                  { label: "Priority", field: "priority" },
                  { label: "Occupant Name", field: "occupant_name" },
                  { label: "Occupant Phone", field: "occupant_phone" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-xs text-neutral-500 mb-1">{label}</label>
                    <input
                      type="text"
                      value={infoFields[field] ?? ""}
                      onChange={(e) =>
                        setInfoFields((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      className="w-full bg-navy border border-navy-border rounded px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-dark transition"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Description</label>
                  <textarea
                    value={infoFields["description"] ?? ""}
                    onChange={(e) =>
                      setInfoFields((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                    className="w-full bg-navy border border-navy-border rounded px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-dark transition resize-none"
                  />
                </div>
              </div>
            ) : (
              <>
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
              </>
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

        {/* Clock Controls */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400">Clock Controls</p>
            {clockStatusLoading && (
              <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            )}
          </div>

          {clockError && (
            <p className="text-red-400 text-sm mb-3">{clockError}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Day-level clock — applies to the user's whole day timesheet */}
            <div className="flex-1 bg-navy border border-navy-border rounded-xl p-4">
              <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Day Clock</p>
              {clockStatus && (
                <p className="text-xs text-neutral-400 mb-3">
                  {clockStatus.clocked_in
                    ? `Clocked in${clockStatus.clock_in_time
                        ? ` at ${new Date(clockStatus.clock_in_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                        : ""}`
                    : "Not clocked in"}
                </p>
              )}
              <button
                type="button"
                onClick={handleDayClock}
                disabled={dayClocking || clockStatusLoading}
                className={`w-full text-sm font-bold py-2.5 rounded-lg transition disabled:opacity-50 ${
                  clockStatus?.clocked_in
                    ? "bg-amber-600/20 text-amber-300 border border-amber-700/40 hover:bg-amber-600/30"
                    : "bg-emerald-600/20 text-emerald-300 border border-emerald-700/40 hover:bg-emerald-600/30"
                }`}
                aria-label={clockStatus?.clocked_in ? "Clock out for the day" : "Clock in for the day"}
              >
                {dayClocking
                  ? "..."
                  : clockStatus?.clocked_in
                  ? "Clock Out (Day)"
                  : "Clock In (Day)"}
              </button>
            </div>

            {/* Per-job clock */}
            <div className="flex-1 bg-navy border border-navy-border rounded-xl p-4">
              <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Job Clock</p>
              {(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape
                const running = (job.time_logs || []).some((l: any) => l.status === "Running");
                return (
                  <>
                    <p className="text-xs text-neutral-400 mb-3">
                      {running ? "Timer running on this job" : "No active timer"}
                    </p>
                    <button
                      type="button"
                      onClick={handleJobClock}
                      disabled={jobClocking}
                      className={`w-full text-sm font-bold py-2.5 rounded-lg transition disabled:opacity-50 ${
                        running
                          ? "bg-amber-600/20 text-amber-300 border border-amber-700/40 hover:bg-amber-600/30"
                          : "bg-cyan-600/20 text-cyan-300 border border-cyan-700/40 hover:bg-cyan-600/30"
                      }`}
                      aria-label={running ? "Stop job timer" : "Start job timer"}
                    >
                      {jobClocking ? "..." : running ? "Stop Job Timer" : "Start Job Timer"}
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Push to HCP */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-400 mb-1">HouseCall Pro Sync</p>
              <p className="text-sm text-neutral-500">
                Push materials, notes, and photos to HCP. Runs a full bi-directional sync.
              </p>
              {syncResult && (
                <p className="text-sm text-emerald-400 mt-1">{syncResult}</p>
              )}
              {syncError && (
                <p className="text-sm text-red-400 mt-1">{syncError}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleHcpSync}
              disabled={syncing}
              className="shrink-0 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
              aria-label="Push this job to HouseCall Pro"
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Syncing...
                </span>
              ) : (
                "Push to HCP"
              )}
            </button>
          </div>
        </div>

        {/* Photos */}
        {(() => {
          const siteUrl = getAuth()?.siteUrl || "https://erp.manytalentsmore.com";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape
          const photos: any[] = job.photos || job.attachments || [];
          return (
            <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs uppercase tracking-wider text-neutral-400">
                  Photos ({photos.length})
                </p>
                {/* Upload trigger */}
                <div className="flex items-center gap-2">
                  {uploadPhotoError && (
                    <span className="text-xs text-red-400">{uploadPhotoError}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gold/20 text-gold hover:bg-gold/30 transition disabled:opacity-50"
                    aria-label="Upload photos"
                  >
                    {uploadingPhoto ? "Uploading..." : "+ Add Photos"}
                  </button>
                  {/* Hidden file input — accepts images, multiple selection */}
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    aria-hidden="true"
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                  />
                </div>
              </div>

              {/* Drag-and-drop zone (shown when no photos yet, or always as a secondary target) */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 mb-4 text-center transition-colors ${
                  uploadingPhoto
                    ? "border-gold/50 bg-gold/5"
                    : "border-navy-border hover:border-gold/40 cursor-pointer"
                }`}
                role="button"
                tabIndex={0}
                aria-label="Drop photos here or click to upload"
                onClick={() => !uploadingPhoto && photoInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!uploadingPhoto) photoInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handlePhotoUpload(e.dataTransfer.files);
                }}
              >
                {uploadingPhoto ? (
                  <div className="flex items-center justify-center gap-2 text-gold text-sm">
                    <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    <span>Uploading photos...</span>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Drag photos here or{" "}
                    <span className="text-gold underline">click to browse</span>
                  </p>
                )}
              </div>

              {photos.length === 0 ? (
                <p className="text-neutral-500 text-sm">No photos yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
                  {photos.map((photo: any, i: number) => {
                    const rawUrl: string = photo.file_url || photo.url || "";
                    const fullUrl = rawUrl.startsWith("http")
                      ? rawUrl
                      : `${siteUrl.replace(/\/+$/, "")}${rawUrl}`;
                    return (
                      <a
                        key={photo.name || i}
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-square rounded-xl overflow-hidden border border-navy-border hover:border-gold-dark transition group"
                        aria-label={`Photo ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- authenticated Frappe file URL requires raw img to pass auth headers */}
                        <img
                          src={fullUrl}
                          alt={`Job photo ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Notes */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 space-y-4">
          <p className="text-xs uppercase tracking-wider text-neutral-400">Notes</p>

          {/* Add note */}
          <div className="flex gap-2 items-end">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="flex-1 bg-navy border border-navy-border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-dark transition resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote();
              }}
            />
            <button
              onClick={handleAddNote}
              disabled={savingNote || !noteText.trim()}
              className="bg-gold-dark text-navy font-bold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-40 whitespace-nowrap"
            >
              {savingNote ? "Saving..." : "Add Note"}
            </button>
          </div>

          {/* Existing notes — newest first */}
          {(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape
            const notes: any[] = job.job_notes || [];
            if (notes.length === 0) {
              return (
                <p className="text-neutral-500 text-sm">No notes on this job yet.</p>
              );
            }
            const sorted = [...notes].sort((a, b) => {
              const ta = new Date(a.note_at || 0).getTime();
              const tb = new Date(b.note_at || 0).getTime();
              return tb - ta;
            });
            return (
              <ul className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
                {sorted.map((note: any, i: number) => (
                  <li
                    key={i}
                    className="bg-navy border border-navy-border rounded-xl px-4 py-3"
                  >
                    <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                      {note.note_text}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      {note.note_by || "Unknown"}
                      {note.note_at
                        ? ` · ${new Date(note.note_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            );
          })()}
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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
                  {job.services.map((s: any, i: number) => (
                    <tr key={i} className="border-b border-navy-border/50">
                      <td className="py-2 pr-4 text-neutral-300">
                        {s.description || s.item_name || "Labor"}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-400">
                        {s.qty}
                      </td>
                      <td className="py-2 px-4 text-right text-neutral-400">
                        {fmtCurrency(s.rate)}
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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
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

        {/* Time Logs */}
        {(() => {
          const logs = (job.time_logs || []) as Array<{
            tech_user?: string;
            start_time?: string;
            end_time?: string;
            status?: string;
            duration_hours?: string | number;
          }>;
          if (logs.length === 0) return null;
          const totalHours = logs.reduce((sum: number, l) => sum + (parseFloat(String(l.duration_hours ?? 0)) || 0), 0);
          return (
            <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider text-neutral-400">
                  Time Logs
                </p>
                <span className="text-xs text-neutral-500">
                  {totalHours.toFixed(2)} hrs total
                </span>
              </div>
              <div className="space-y-2">
                {logs.map((log, i) => {
                  const clockIn = log.start_time
                    ? new Date(log.start_time).toLocaleString("en-US", {
                        month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                      })
                    : "—";
                  const clockOut = log.end_time
                    ? new Date(log.end_time).toLocaleString("en-US", {
                        hour: "numeric", minute: "2-digit",
                      })
                    : log.status === "Running" ? "Running..." : "—";
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-navy border border-navy-border rounded-lg px-4 py-3"
                    >
                      <div>
                        <p className="text-sm text-cream font-medium">
                          {log.tech_user || "Unknown Tech"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {clockIn}{log.end_time ? ` → ${clockOut}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        {log.status === "Running" ? (
                          <span className="text-xs bg-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-sm font-medium text-neutral-300">
                            {parseFloat(String(log.duration_hours ?? 0)).toFixed(2)} hrs
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Finish-Job Checklist (office audit) */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Completion Checklist
            </p>
            {!checklistVisible ? (
              <button
                onClick={() => {
                  setChecklistVisible(true);
                  if (!checklist) {
                    setChecklistLoading(true);
                    setChecklistError("");
                    getJobChecklist(jobName)
                      .then((data) => setChecklist(data))
                      .catch(() => setChecklistError("Could not load checklist"))
                      .finally(() => setChecklistLoading(false));
                  }
                }}
                className="text-xs text-gold hover:text-gold-light transition"
              >
                Load
              </button>
            ) : (
              <button
                onClick={() => setChecklistVisible(false)}
                className="text-xs text-neutral-500 hover:text-cream transition"
              >
                Hide
              </button>
            )}
          </div>

          {checklistVisible && (
            <>
              {checklistLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
              )}
              {checklistError && (
                <p className="text-red-400 text-sm">{checklistError}</p>
              )}
              {checklist && !checklistLoading && (
                <ul className="space-y-2">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
                  {(checklist.items as any[]).map((item: any) => (
                    <li
                      key={item.idx}
                      className={`flex items-start gap-3 bg-navy border rounded-xl px-4 py-3 ${
                        item.checked
                          ? "border-emerald-900/60"
                          : item.required
                          ? "border-amber-900/40"
                          : "border-navy-border"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          item.checked
                            ? "border-emerald-500 bg-emerald-900/40 text-emerald-400"
                            : item.required
                            ? "border-amber-700 text-transparent"
                            : "border-neutral-700 text-transparent"
                        }`}
                      >
                        {item.checked ? "✓" : ""}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${item.checked ? "text-neutral-300" : "text-cream"}`}>
                          {item.item_text}
                          {item.required ? (
                            <span className="ml-1.5 text-xs text-amber-500/70 font-medium">required</span>
                          ) : null}
                        </p>
                        {item.checked && (item.checked_by || item.checked_at) && (
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {item.checked_by || "Unknown"}
                            {item.checked_at
                              ? ` · ${new Date(item.checked_at).toLocaleString("en-US", {
                                  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                                })}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {checklist && checklist.items.length === 0 && (
                <p className="text-neutral-500 text-sm">No checklist items for this job type.</p>
              )}
            </>
          )}
        </div>

        {/* Materials */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-neutral-400">
              Materials ({(job.materials || []).length})
            </p>
            {!editingMaterials ? (
              <button
                onClick={() => { setEditingMaterials(true); setMaterialSearch(""); setMaterialSearchResults([]); }}
                className="text-xs text-gold hover:text-gold-light transition"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={() => { setEditingMaterials(false); setMaterialSearch(""); setMaterialSearchResults([]); }}
                className="text-xs text-neutral-500 hover:text-cream transition"
              >
                Done
              </button>
            )}
          </div>

          {editingMaterials ? (
            <div className="space-y-3">
              {/* Existing material rows — editable */}
              {(job.materials || []).length === 0 ? (
                <p className="text-neutral-500 text-sm">No materials yet. Add one below.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-neutral-500 uppercase border-b border-navy-border">
                        <th className="text-left py-2 pr-2">Item</th>
                        <th className="text-right py-2 px-2">Qty</th>
                        <th className="text-right py-2 px-2">Rate</th>
                        <th className="text-right py-2 px-2">Total</th>
                        <th className="py-2 pl-2 w-6"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
                      {(job.materials as any[]).map((m: any) => (
                        <tr key={m.name} className="border-b border-navy-border/50">
                          <td className="py-2 pr-2 text-neutral-300 text-xs max-w-[140px] truncate">
                            {m.item_name || m.item || "Unknown"}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              defaultValue={m.quantity}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val !== m.quantity) {
                                  setSavingMaterials(true);
                                  updateMaterialQty(jobName, m.name, val)
                                    .then(() => loadJob())
                                    .catch((err: unknown) => setError(getErrorMessage(err) || "Could not update qty"))
                                    .finally(() => setSavingMaterials(false));
                                }
                              }}
                              className="w-16 bg-navy border border-navy-border rounded px-2 py-1 text-sm text-cream text-right focus:outline-none focus:border-gold-dark"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              defaultValue={m.cost_rate}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val !== m.cost_rate) {
                                  setSavingMaterials(true);
                                  updateMaterialRate(jobName, m.name, val)
                                    .then(() => loadJob())
                                    .catch((err: unknown) => setError(getErrorMessage(err) || "Could not update rate"))
                                    .finally(() => setSavingMaterials(false));
                                }
                              }}
                              className="w-20 bg-navy border border-navy-border rounded px-2 py-1 text-sm text-cream text-right focus:outline-none focus:border-gold-dark"
                            />
                          </td>
                          <td className="py-2 px-2 text-right text-gold font-medium text-sm">
                            {fmtCurrency((m.quantity || 0) * (m.cost_rate || 0))}
                          </td>
                          <td className="py-2 pl-2 text-center">
                            <button
                              onClick={() => {
                                if (!confirm(`Remove ${m.item_name || m.item}?`)) return;
                                setSavingMaterials(true);
                                removeMaterial(jobName, m.name)
                                  .then(() => loadJob())
                                  .catch((err: unknown) => setError(getErrorMessage(err) || "Could not remove material"))
                                  .finally(() => setSavingMaterials(false));
                              }}
                              className="text-neutral-600 hover:text-red-400 text-lg leading-none"
                              title="Remove"
                              aria-label="Remove material"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Material total */}
              {(job.materials || []).length > 0 && (
                <div className="flex justify-end pt-1 border-t border-navy-border">
                  <span className="text-xs text-neutral-500 mr-2">Materials total:</span>
                  <span className="text-sm font-medium text-cream">{fmtCurrency(job.total_material_cost || 0)}</span>
                </div>
              )}

              {savingMaterials && (
                <p className="text-xs text-neutral-500 animate-pulse">Saving...</p>
              )}

              {/* Add material search */}
              <div className="pt-3 border-t border-navy-border">
                <p className="text-xs text-neutral-500 mb-2">Add material from pricebook</p>
                <div className="relative">
                  <input
                    type="text"
                    value={materialSearch}
                    onChange={(e) => {
                      const q = e.target.value;
                      setMaterialSearch(q);
                      if (q.length < 2) { setMaterialSearchResults([]); return; }
                      setMaterialSearching(true);
                      searchPricebook(q, 15)
                        .then((res) => setMaterialSearchResults(res || []))
                        .catch(() => setMaterialSearchResults([]))
                        .finally(() => setMaterialSearching(false));
                    }}
                    placeholder="Search parts (e.g. 3/4 gate valve)..."
                    className="w-full bg-navy border border-navy-border rounded px-3 py-2 text-sm text-cream focus:outline-none focus:border-gold-dark transition"
                  />
                  {materialSearching && (
                    <div className="absolute right-3 top-2.5">
                      <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {materialSearchResults.length > 0 && (
                  <ul className="mt-1 bg-navy border border-navy-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {materialSearchResults.map((item) => (
                      <li key={item.name}>
                        <button
                          onClick={() => {
                            setAddingMaterial(true);
                            addMaterial(jobName, item.name, parseFloat(pendingAddQty) || 1, "office", "")
                              .then(() => {
                                setMaterialSearch("");
                                setMaterialSearchResults([]);
                                setPendingAddQty("1");
                                loadJob();
                              })
                              .catch((err: unknown) => setError(getErrorMessage(err) || "Could not add material"))
                              .finally(() => setAddingMaterial(false));
                          }}
                          disabled={addingMaterial}
                          className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-navy-surface transition text-sm disabled:opacity-50"
                        >
                          <span className="text-cream">{item.item_name}</span>
                          <span className="text-gold text-xs ml-2 flex-shrink-0">{fmtCurrency(item.standard_rate)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {addingMaterial && (
                  <p className="text-xs text-neutral-500 mt-1 animate-pulse">Adding...</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <label className="text-xs text-neutral-500">Qty:</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={pendingAddQty}
                    onChange={(e) => setPendingAddQty(e.target.value)}
                    className="w-16 bg-navy border border-navy-border rounded px-2 py-1 text-sm text-cream focus:outline-none focus:border-gold-dark"
                  />
                </div>
              </div>
            </div>
          ) : (job.materials || []).length > 0 ? (
            <div>
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
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
                    {(job.materials as any[]).map((m: any, i: number) => (
                      <tr key={m.name || i} className="border-b border-navy-border/50">
                        <td className="py-2 pr-4 text-neutral-300">
                          {m.item_name || m.item_code || "Unknown"}
                        </td>
                        <td className="py-2 px-4 text-right text-neutral-400">
                          {m.quantity}
                        </td>
                        <td className="py-2 px-4 text-right text-neutral-400">
                          {fmtCurrency(m.cost_rate)}
                        </td>
                        <td className="py-2 pl-4 text-right text-cream font-medium">
                          {fmtCurrency(m.amount || (m.quantity || 0) * (m.cost_rate || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-2 border-t border-navy-border mt-2">
                <span className="text-xs text-neutral-500 mr-2">Materials total:</span>
                <span className="text-sm font-medium text-cream">{fmtCurrency(job.total_material_cost || 0)}</span>
              </div>
            </div>
          ) : (
            <p className="text-neutral-500 text-sm">
              No materials added yet.{" "}
              <button
                onClick={() => { setEditingMaterials(true); setMaterialSearch(""); setMaterialSearchResults([]); }}
                className="text-gold hover:text-gold-light"
              >
                Add materials
              </button>
            </p>
          )}
        </div>

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
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe API response shape */}
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
