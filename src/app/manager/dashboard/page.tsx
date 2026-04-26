"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, getWorkflowCounts, globalSearch, type WorkflowCounts, type SearchResult } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";
import ARAgingWidget from "./widgets/ARAgingWidget";
import JobRevenueWidget from "./widgets/JobRevenueWidget";
import JobCountWidget from "./widgets/JobCountWidget";
import TeamLeaderboardWidget from "./widgets/TeamLeaderboardWidget";
import NeedsCheckWidget from "./widgets/NeedsCheckWidget";
import NeedEstimateWidget from "./widgets/NeedEstimateWidget";
import ServicePlansDueWidget from "./widgets/ServicePlansDueWidget";
import JobsImagesWidget from "./widgets/JobsImagesWidget";

interface PipelineCard {
  key: keyof WorkflowCounts;
  label: string;
  description: string;
  color: string;
  href: string;
}

const PIPELINE: PipelineCard[] = [
  {
    key: "finished",
    label: "Finished",
    description: "Tech completed, not yet reviewed",
    color: "from-orange-500 to-orange-600",
    href: "/manager/section/finished",
  },
  {
    key: "needs_checked",
    label: "Needs Checked",
    description: "Ready for Adam's approval",
    color: "from-purple-500 to-purple-600",
    href: "/manager/section/needs_checked",
  },
  {
    key: "to_invoice",
    label: "To Invoice",
    description: "Approved, create invoice",
    color: "from-blue-500 to-blue-600",
    href: "/manager/section/to_invoice",
  },
  {
    key: "pending_payment",
    label: "Pending Payment",
    description: "Invoice sent, awaiting payment",
    color: "from-amber-500 to-amber-600",
    href: "/manager/section/pending_payment",
  },
  {
    key: "paid_today",
    label: "Paid Today",
    description: "Completed today",
    color: "from-green-500 to-green-600",
    href: "/manager/section/paid",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<WorkflowCounts>({
    finished: 0,
    needs_checked: 0,
    to_invoice: 0,
    pending_payment: 0,
    paid_today: 0,
  });
  const [loading, setLoading] = useState(true);
  const [countError, setCountError] = useState(false);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearchOpen(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await globalSearch(q);
        setResults(r);
        setSearchOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const MATCH_LABELS: Record<string, string> = {
    job_number: "Job #", customer: "Customer", address: "Address",
    town: "Town", description: "Description", tech: "Tech", other: "",
  };

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
  };

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    getWorkflowCounts()
      .then(setCounts)
      .catch((err) => {
        console.warn("Failed to load counts:", err);
        setCountError(true);
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-widest text-gold mb-2">
            Office Pipeline
          </p>
          <h2 className="text-3xl font-serif font-extrabold">
            Move the work forward.
          </h2>
          <p className="text-neutral-400 mt-2">
            Each stage is a queue. Review, approve, invoice, collect.
          </p>
        </div>

        {countError && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-4">
            Unable to load counts
          </div>
        )}

        {/* Pipeline cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PIPELINE.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="group bg-navy-surface border border-navy-border rounded-2xl p-6 hover:border-gold-dark hover:-translate-y-1 transition-all"
            >
              <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                {card.label}
              </p>
              <p className="text-5xl font-serif font-extrabold mb-3 text-gold-gradient">
                {loading ? "..." : countError ? "—" : counts[card.key]}
              </p>
              <p className="text-xs text-neutral-500">{card.description}</p>
              <div
                className={`h-1 rounded-full mt-4 bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition`}
              />
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <Link
            href="/manager/jobs/new"
            className="inline-flex items-center gap-3 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-6 py-3.5 rounded-xl text-sm hover:from-gold-light hover:to-gold transition shadow-lg shadow-gold-dark/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Job
          </Link>
        </div>

        {/* Dashboard Widgets */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="lg:col-span-2">
            <ARAgingWidget />
          </div>
          <JobRevenueWidget />
          <TeamLeaderboardWidget />
          <JobCountWidget />
          <NeedsCheckWidget />
          <NeedEstimateWidget />
          <ServicePlansDueWidget />
          <div className="lg:col-span-2">
            <JobsImagesWidget />
          </div>
        </div>
      </main>

    </div>
  );
}
