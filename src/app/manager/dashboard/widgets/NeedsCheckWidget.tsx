"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WidgetShell from "./WidgetShell";
import { getJobsByStatus } from "@/lib/frappe";

interface JobRow {
  name: string;
  hcp_job_id: string;
  customer_name: string;
  address: string;
}

const MAX_ROWS = 8;

export default function NeedsCheckWidget() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobsByStatus("needs_checked")
      .then((data: any) => {
        const list: JobRow[] = Array.isArray(data) ? data : (data?.jobs ?? []);
        setJobs(list.slice(0, MAX_ROWS));
      })
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title={`Needs Check (${loading ? "…" : jobs.length})`} loading={loading}>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : jobs.length === 0 ? (
        <p className="text-cream/40 text-sm italic">All caught up.</p>
      ) : (
        <ul className="divide-y divide-navy-border">
          {jobs.map((job) => (
            <li key={job.name}>
              <button
                onClick={() => router.push(`/manager/jobs/${job.name}`)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-navy-card/50 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold px-1"
                aria-label={`${job.customer_name} — ${job.address}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-cream text-sm font-medium truncate">{job.customer_name}</p>
                  <p className="text-cream/40 text-xs truncate">{job.address}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-cream/30 font-mono">
                  #{job.hcp_job_id}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}
