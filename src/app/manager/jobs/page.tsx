"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, getJobList } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

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

const TERMINAL_STATUSES = new Set(["Completed", "Checked", "Paid", "Canceled", "Invoiced"]);

const ALL_STATUSES = [
  "all",
  "Entered", "Scheduled", "Assigned", "In Progress", "On Hold",
  "Completed", "Needs Check", "Checked", "Invoiced", "Paid", "Canceled",
];

function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/manager/jobs/${job.name}`}
      className="block bg-navy-surface border border-navy-border rounded-xl p-5 hover:border-gold-dark transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
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
            <div className="flex gap-2 mt-3 flex-wrap">
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
            {job.scheduled_date || "Unscheduled"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function JobsPage() {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [allStatusFilter, setAllStatusFilter] = useState("all");

  // Load all jobs once from the existing endpoint
  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    getJobList()
      .then((data: any) => setAllJobs(data || []))
      .catch((err) => console.warn("Failed to load jobs:", err))
      .finally(() => setLoading(false));
  }, [router]);

  // Client-side search filter
  const matchesSearch = (job: Job, q: string) => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (
      (job.customer_name || "").toLowerCase().includes(lower) ||
      (job.address || "").toLowerCase().includes(lower) ||
      (job.hcp_job_id || "").toLowerCase().includes(lower) ||
      (job.description || "").toLowerCase().includes(lower) ||
      (job.town || "").toLowerCase().includes(lower)
    );
  };

  // Active jobs = non-terminal status (client-side filter)
  const activeJobs = useMemo(() => {
    return allJobs.filter((j) => !TERMINAL_STATUSES.has(j.status));
  }, [allJobs]);

  // Search results
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    return allJobs.filter((j) => matchesSearch(j, globalSearch));
  }, [allJobs, globalSearch]);

  // All jobs section with status filter
  const filteredAllJobs = useMemo(() => {
    return allJobs.filter((j) => {
      if (allStatusFilter !== "all" && j.status !== allStatusFilter) return false;
      return true;
    });
  }, [allJobs, allStatusFilter]);

  const isSearching = globalSearch.trim().length > 0;

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Global Search */}
        <div className="mb-10">
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search all jobs — customer, address, job number, description..."
            className="w-full bg-navy-surface border border-navy-border rounded-xl px-6 py-4 text-cream text-lg placeholder-neutral-600 focus:outline-none focus:border-gold transition"
          />

          {isSearching && (
            <div className="mt-3">
              {searchResults.length > 0 ? (
                <>
                  <p className="text-xs uppercase tracking-wider text-neutral-500 mb-3 px-2">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-2">
                    {searchResults.slice(0, 50).map((job) => (
                      <JobCard key={job.name} job={job} />
                    ))}
                  </div>
                  {searchResults.length > 50 && (
                    <p className="text-xs text-neutral-500 mt-3 px-2">
                      Showing first 50 of {searchResults.length}. Refine your search.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-neutral-500 px-2">No jobs match &ldquo;{globalSearch}&rdquo;</p>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <span className="ml-3 text-neutral-400 text-sm">Loading jobs...</span>
          </div>
        )}

        {!loading && !isSearching && (
          <>
            {/* ── Active Jobs ─────────────────────────────────── */}
            <section className="mb-12">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl font-serif font-bold text-cream">
                  Active Jobs
                </h2>
                <span className="text-sm text-neutral-500">
                  {activeJobs.length} active
                </span>
              </div>

              {activeJobs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 bg-navy-surface border border-navy-border rounded-xl">
                  <p>No active jobs</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <JobCard key={job.name} job={job} />
                  ))}
                </div>
              )}
            </section>

            {/* ── All Jobs ────────────────────────────────────── */}
            <section>
              <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-3 mb-4">
                <h2 className="text-xl font-serif font-bold text-cream">
                  All Jobs
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-neutral-500">
                    {filteredAllJobs.length} of {allJobs.length}
                  </span>
                  <select
                    value={allStatusFilter}
                    onChange={(e) => setAllStatusFilter(e.target.value)}
                    className="bg-navy-surface border border-navy-border rounded-lg px-3 py-1.5 text-sm text-cream focus:outline-none focus:border-gold-dark"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s === "all" ? "All Statuses" : s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredAllJobs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 bg-navy-surface border border-navy-border rounded-xl">
                  <p>No jobs found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAllJobs.slice(0, 50).map((job) => (
                    <JobCard key={job.name} job={job} />
                  ))}
                  {filteredAllJobs.length > 50 && (
                    <p className="text-center text-sm text-neutral-500 py-4">
                      Showing 50 of {filteredAllJobs.length} — use search to find specific jobs
                    </p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
