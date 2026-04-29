"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getAuth, getCustomerProfile, type CustomerProfile } from "@/lib/frappe";
import { getFeatureFlags } from "@/lib/features";
import NavBar from "@/app/manager/components/NavBar";

const STATUS_COLORS: Record<string, string> = {
  Entered: "bg-cream/10 text-cream/50",
  Scheduled: "bg-green-500/20 text-green-400",
  Assigned: "bg-blue-500/20 text-blue-400",
  "In Progress": "bg-blue-500/20 text-blue-400",
  Completed: "bg-orange-500/20 text-orange-400",
  "Needs Check": "bg-purple-500/20 text-purple-400",
  Checked: "bg-cyan-500/20 text-cyan-400",
  Invoiced: "bg-amber-500/20 text-amber-400",
  Paid: "bg-green-500/20 text-green-400",
};

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || "bg-cream/10 text-cream/50";
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const customerName = decodeURIComponent(params.name as string);

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    if (!getFeatureFlags().customers) { router.replace("/manager/dashboard"); return; }
    getCustomerProfile(customerName)
      .then(setProfile)
      .catch((err: any) => setError(err.message || "Failed to load customer"))
      .finally(() => setLoading(false));
  }, [customerName, router]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-8">
            <p className="text-red-300 mb-4">{error || "Customer not found"}</p>
            <Link href="/manager/customers" className="text-gold text-sm hover:text-gold-light transition">
              &larr; Back to Customers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const createdYear = profile.creation
    ? new Date(profile.creation).getFullYear()
    : null;

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Back link */}
        <Link
          href="/manager/customers"
          className="inline-flex items-center gap-1 text-sm text-cream/50 hover:text-cream transition"
        >
          &larr; Customers
        </Link>

        {/* Header card */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-cream">{profile.customer_name}</h1>
              <div className="mt-2 space-y-1">
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="block text-sm text-gold hover:text-gold-light transition"
                  >
                    {profile.phone}
                  </a>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="block text-sm text-neutral-400 hover:text-cream transition"
                  >
                    {profile.email}
                  </a>
                )}
                {createdYear && (
                  <p className="text-xs text-neutral-500">
                    Customer since {createdYear}
                  </p>
                )}
              </div>
            </div>

            {/* Create Job action */}
            <Link
              href={`/manager/jobs/new?customer=${encodeURIComponent(profile.name)}`}
              className="flex-shrink-0 inline-flex items-center gap-2 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-5 py-2.5 rounded-lg hover:from-gold-light hover:to-gold transition text-sm"
            >
              + Create Job
            </Link>
          </div>
        </div>

        {/* Financials row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Total Owed</p>
            <p className={`text-3xl font-serif font-bold ${profile.total_owed > 0 ? "text-red-400" : "text-neutral-500"}`}>
              {profile.total_owed > 0 ? fmtCurrency(profile.total_owed) : "—"}
            </p>
            {profile.total_owed > 0 && (
              <p className="text-xs text-red-400/70 mt-1">Outstanding balance</p>
            )}
          </div>
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Lifetime Value</p>
            <p className="text-3xl font-serif font-bold text-gold">
              {fmtCurrency(profile.lifetime_value)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {profile.jobs.length} job{profile.jobs.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>

        {/* Addresses */}
        {profile.addresses.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
              Addresses ({profile.addresses.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.addresses.map((addr) => (
                <div
                  key={addr.name}
                  className="bg-navy border border-navy-border rounded-lg px-4 py-3"
                >
                  <p className="text-sm text-cream">{addr.address_line1}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Jobs */}
        {profile.upcoming_jobs.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
              Upcoming Jobs ({profile.upcoming_jobs.length})
            </p>
            <div className="space-y-2">
              {profile.upcoming_jobs.map((job) => (
                <Link
                  key={job.name}
                  href={`/manager/jobs/${job.name}`}
                  className="flex items-center justify-between bg-navy border border-navy-border rounded-lg px-4 py-3 hover:border-gold-dark transition group"
                >
                  <div>
                    <span className="text-xs font-mono text-gold">#{job.hcp_job_id}</span>
                    <p className="text-sm text-cream mt-0.5 truncate max-w-xs">{job.address}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Job History */}
        {profile.jobs.length > 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
              Job History ({profile.jobs.length})
            </p>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-border">
                    <th className="text-left py-2 pr-4 text-xs font-bold text-cream/50 tracking-wider">JOB #</th>
                    <th className="text-left py-2 px-4 text-xs font-bold text-cream/50 tracking-wider">ADDRESS</th>
                    <th className="text-center py-2 px-4 text-xs font-bold text-cream/50 tracking-wider">STATUS</th>
                    <th className="text-right py-2 px-4 text-xs font-bold text-cream/50 tracking-wider">TOTAL</th>
                    <th className="text-right py-2 pl-4 text-xs font-bold text-cream/50 tracking-wider">DATE</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.jobs.map((job) => (
                    <tr
                      key={job.name}
                      onClick={() => router.push(`/manager/jobs/${job.name}`)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/manager/jobs/${job.name}`); } }}
                      role="link"
                      tabIndex={0}
                      className="border-b border-navy-border/50 hover:bg-navy-card/50 transition cursor-pointer"
                    >
                      <td className="py-3 pr-4">
                        <span className="text-xs font-mono text-gold">#{job.hcp_job_id}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-300 max-w-xs truncate">
                        {job.address || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-cream">
                        {fmtCurrency(job.total_job_cost)}
                      </td>
                      <td className="py-3 pl-4 text-right text-sm text-neutral-500">
                        {fmtDate(job.modified)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden space-y-2">
              {profile.jobs.map((job) => (
                <Link
                  key={job.name}
                  href={`/manager/jobs/${job.name}`}
                  className="flex items-start justify-between bg-navy border border-navy-border rounded-lg px-4 py-3 hover:border-gold-dark transition"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-mono text-gold">#{job.hcp_job_id}</span>
                    <p className="text-sm text-neutral-300 truncate mt-0.5">{job.address || "—"}</p>
                    <div className="mt-1.5">
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-medium text-cream">{fmtCurrency(job.total_job_cost)}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{fmtDate(job.modified)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {profile.jobs.length === 0 && profile.upcoming_jobs.length === 0 && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl px-6 py-12 text-center">
            <p className="text-neutral-500">No jobs on record for this customer.</p>
            <Link
              href={`/manager/jobs/new?customer=${encodeURIComponent(profile.name)}`}
              className="inline-block mt-4 text-sm text-gold hover:text-gold-light transition"
            >
              Create first job
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
