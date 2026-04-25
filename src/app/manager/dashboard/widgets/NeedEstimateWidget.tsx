"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WidgetShell from "./WidgetShell";
import { getJobsNeedingEstimate } from "@/lib/frappe";

interface EstimateJob {
  name: string;
  hcp_job_id: string;
  customer_name: string;
  address: string;
  status: string;
  modified: string;
}

const MAX_ROWS = 8;

export default function NeedEstimateWidget() {
  const router = useRouter();
  const [jobs, setJobs] = useState<EstimateJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobsNeedingEstimate()
      .then((data) => {
        setJobs(data.jobs.slice(0, MAX_ROWS));
      })
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title={`Need Estimate (${loading ? "…" : jobs.length})`} loading={loading}>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : jobs.length === 0 ? (
        <p className="text-cream/40 text-sm italic">No estimates needed.</p>
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
