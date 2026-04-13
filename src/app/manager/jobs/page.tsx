"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, getJobList } from "@/lib/frappe";

interface Job {
  name: string;
  hcp_job_id: string;
  customer_name: string;
  address: string;
  town: string;
  description: string;
  status: string;
  scheduled_date: string;
  priority: number;
  total_job_cost: number;
  assigned_techs: Array<{ tech_name: string; tech_user: string }>;
}

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

export default function AllJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    getJobList()
      .then((data: any) => setJobs(data || []))
      .catch((err) => console.warn("Failed to load jobs:", err))
      .finally(() => setLoading(false));
  }, [router]);

  const statuses = ["all", ...Array.from(new Set(jobs.map((j) => j.status)))];

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (job.customer_name || "").toLowerCase().includes(q) ||
      (job.address || "").toLowerCase().includes(q) ||
      (job.hcp_job_id || "").toLowerCase().includes(q) ||
      (job.description || "").toLowerCase().includes(q) ||
      (job.town || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/manager/dashboard"
            className="text-neutral-400 hover:text-gold-light transition"
          >
            ← Dashboard
          </Link>
          <div className="h-5 w-px bg-navy-border" />
          <div>
            <h1 className="font-serif text-lg font-bold">All Jobs</h1>
            <p className="text-xs text-neutral-500">Every job in the system</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, address, job number..."
            className="flex-1 bg-navy-surface border border-navy-border rounded-lg px-5 py-3 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-navy-surface border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark"
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All Statuses" : s}
              </option>
            ))}
          </select>
        </div>

        {/* Count */}
        <p className="text-xs uppercase tracking-wider text-neutral-500 mb-4">
          {loading
            ? "Loading..."
            : `${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""}`}
        </p>

        {/* Job list */}
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Link
              key={job.name}
              href={`/manager/jobs/${job.name}`}
              className="block bg-navy-surface border border-navy-border rounded-xl p-5 hover:border-gold-dark transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-serif text-lg font-bold">
                      {job.customer_name || "Unknown Customer"}
                    </span>
                    <span className="text-xs text-gold">#{job.hcp_job_id}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[job.status] || "bg-neutral-700 text-neutral-300"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 truncate">
                    {job.address}
                    {job.town ? `, ${job.town}` : ""}
                  </p>
                  <p className="text-sm text-neutral-500 mt-2 line-clamp-2">
                    {job.description}
                  </p>
                  {job.assigned_techs && job.assigned_techs.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {job.assigned_techs.map((t, i) => (
                        <span
                          key={i}
                          className="text-xs bg-navy border border-navy-border rounded px-2 py-1 text-neutral-400"
                        >
                          {t.tech_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-serif font-bold text-gold-gradient">
                    ${(job.total_job_cost || 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {job.scheduled_date || "No date"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-20 text-neutral-500">
              <p className="text-lg">No jobs found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
