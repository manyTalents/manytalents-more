"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, getManagerJobs } from "@/lib/frappe";
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
  modified: string;
  assigned_techs: Array<{ tech_name: string; tech_user: string }>;
}

interface JobResult {
  jobs: Job[];
  total: number;
  page: number;
  page_length: number;
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

const ALL_STATUSES = [
  "all",
  "Entered",
  "Scheduled",
  "Assigned",
  "In Progress",
  "On Hold",
  "Completed",
  "Needs Check",
  "Checked",
  "Invoiced",
  "Paid",
  "Canceled",
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

  // Global search
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Job[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searching, setSearching] = useState(false);

  // Active jobs
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [activeTotal, setActiveTotal] = useState(0);
  const [activeLoading, setActiveLoading] = useState(true);

  // All jobs
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allPage, setAllPage] = useState(1);
  const [allStatus, setAllStatus] = useState("all");
  const [allLoading, setAllLoading] = useState(false);

  // Auth check + load active jobs
  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    getManagerJobs({ mode: "active", page_length: 200 })
      .then((res: JobResult) => {
        setActiveJobs(res.jobs);
        setActiveTotal(res.total);
      })
      .catch((err) => console.warn("Failed to load active jobs:", err))
      .finally(() => setActiveLoading(false));
  }, [router]);

  // Load all jobs (with pagination + status filter)
  const loadAllJobs = useCallback(
    (page: number, status: string) => {
      setAllLoading(true);
      getManagerJobs({
        mode: "all",
        status: status === "all" ? "" : status,
        page_length: 50,
        page,
      })
        .then((res: JobResult) => {
          setAllJobs(res.jobs);
          setAllTotal(res.total);
          setAllPage(res.page);
        })
        .catch((err) => console.warn("Failed to load all jobs:", err))
        .finally(() => setAllLoading(false));
    },
    []
  );

  // Load all jobs on mount
  useEffect(() => {
    if (getAuth()) loadAllJobs(1, "all");
  }, [loadAllJobs]);

  // Global search (debounced)
  useEffect(() => {
    if (!globalSearch.trim()) {
      setSearchResults([]);
      setSearchTotal(0);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      getManagerJobs({ mode: "all", search: globalSearch.trim(), page_length: 20 })
        .then((res: JobResult) => {
          setSearchResults(res.jobs);
          setSearchTotal(res.total);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  const allTotalPages = Math.ceil(allTotal / 50);
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

          {/* Search results dropdown */}
          {isSearching && (
            <div className="mt-3">
              {searching ? (
                <p className="text-sm text-neutral-500 px-2">Searching...</p>
              ) : searchResults.length > 0 ? (
                <>
                  <p className="text-xs uppercase tracking-wider text-neutral-500 mb-3 px-2">
                    {searchTotal} result{searchTotal !== 1 ? "s" : ""} found
                  </p>
                  <div className="space-y-2">
                    {searchResults.map((job) => (
                      <JobCard key={job.name} job={job} />
                    ))}
                  </div>
                  {searchTotal > 20 && (
                    <p className="text-xs text-neutral-500 mt-3 px-2">
                      Showing first 20 of {searchTotal}. Refine your search for more.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-neutral-500 px-2">No jobs match "{globalSearch}"</p>
              )}
            </div>
          )}
        </div>

        {/* Only show sections when NOT searching */}
        {!isSearching && (
          <>
            {/* ── Active Jobs ─────────────────────────────────── */}
            <section className="mb-12">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl font-serif font-bold text-cream">
                  Active Jobs
                </h2>
                <span className="text-sm text-neutral-500">
                  {activeLoading ? "..." : `${activeTotal} active`}
                </span>
              </div>

              {activeLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  <span className="ml-3 text-neutral-400 text-sm">Loading...</span>
                </div>
              ) : activeJobs.length === 0 ? (
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
                    {allLoading ? "..." : `${allTotal} total`}
                  </span>
                  <select
                    value={allStatus}
                    onChange={(e) => {
                      setAllStatus(e.target.value);
                      loadAllJobs(1, e.target.value);
                    }}
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

              {allLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  <span className="ml-3 text-neutral-400 text-sm">Loading...</span>
                </div>
              ) : allJobs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 bg-navy-surface border border-navy-border rounded-xl">
                  <p>No jobs found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {allJobs.map((job) => (
                      <JobCard key={job.name} job={job} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {allTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button
                        onClick={() => loadAllJobs(allPage - 1, allStatus)}
                        disabled={allPage <= 1}
                        className="px-4 py-2 rounded-lg bg-navy-surface border border-navy-border text-sm text-cream disabled:opacity-30 hover:border-gold-dark transition"
                      >
                        Prev
                      </button>
                      <span className="text-sm text-neutral-500">
                        Page {allPage} of {allTotalPages}
                      </span>
                      <button
                        onClick={() => loadAllJobs(allPage + 1, allStatus)}
                        disabled={allPage >= allTotalPages}
                        className="px-4 py-2 rounded-lg bg-navy-surface border border-navy-border text-sm text-cream disabled:opacity-30 hover:border-gold-dark transition"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
