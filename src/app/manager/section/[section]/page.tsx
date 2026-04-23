"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getAuth, getJobsByStatus } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

const SECTION_TITLES: Record<string, { label: string; subtitle: string }> = {
  finished: {
    label: "Finished",
    subtitle: "Tech completed — office to review and correct",
  },
  needs_checked: {
    label: "Needs Checked",
    subtitle: "Office reviewed — waiting for Adam's approval",
  },
  to_invoice: {
    label: "To Invoice",
    subtitle: "Adam approved — create and send invoice",
  },
  pending_payment: {
    label: "Pending Payment",
    subtitle: "Invoice sent — awaiting customer payment",
  },
  paid: {
    label: "Paid",
    subtitle: "Completed and paid",
  },
};

interface Job {
  name: string;
  hcp_job_id: string;
  customer_name: string;
  address: string;
  town: string;
  description: string;
  status: string;
  scheduled_date: string;
  total_job_cost: number;
  assigned_techs: Array<{ tech_name: string; tech_user: string }>;
}

export default function SectionPage() {
  const router = useRouter();
  const params = useParams();
  const section = params.section as string;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const title = SECTION_TITLES[section];

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    if (!title) {
      router.replace("/manager/dashboard");
      return;
    }
    getJobsByStatus(section)
      .then((data: any) => setJobs(data || []))
      .catch((err) => console.warn("Failed to load jobs:", err))
      .finally(() => setLoading(false));
  }, [section, router, title]);

  const filteredJobs = jobs.filter((job) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (job.customer_name || "").toLowerCase().includes(q) ||
      (job.address || "").toLowerCase().includes(q) ||
      (job.hcp_job_id || "").toLowerCase().includes(q) ||
      (job.description || "").toLowerCase().includes(q)
    );
  });

  if (!title) return null;

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Section sub-header */}
      <div className="border-b border-navy-border bg-navy-surface/40">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <h2 className="font-serif text-lg font-bold">{title.label}</h2>
          <p className="text-xs text-neutral-500">{title.subtitle}</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, address, job number, description..."
            className="w-full bg-navy-surface border border-navy-border rounded-lg px-5 py-3 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark"
          />
        </div>

        {/* Count */}
        <p className="text-xs uppercase tracking-wider text-neutral-500 mb-4">
          {loading ? "Loading..." : `${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""}`}
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
                  <p className="text-xs text-neutral-500 mt-1">{job.status}</p>
                </div>
              </div>
            </Link>
          ))}
          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-20 text-neutral-500">
              <p className="text-lg">No jobs in this section</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
