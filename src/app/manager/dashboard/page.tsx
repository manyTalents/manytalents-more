"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, clearAuth, getWorkflowCounts, globalSearch, type WorkflowCounts, type SearchResult } from "@/lib/frappe";

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
    description: "Tech completed, office to review",
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
      .catch((err) => console.warn("Failed to load counts:", err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.replace("/manager");
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <h1 className="text-xl font-serif font-extrabold">
              Many<span className="text-gold-gradient">Talents</span> Manager
            </h1>
            <span className="text-xs text-neutral-500 uppercase tracking-wider hidden sm:inline">
              Office Dashboard
            </span>
          </div>

          {/* Search bar */}
          <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setSearchOpen(true)}
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
              placeholder="Search jobs, customers, addresses, techs..."
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-2 text-sm text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
              </div>
            )}
            {searchOpen && results.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-navy-surface border border-navy-border rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                {results.map((r) => (
                  <Link
                    key={r.job_name}
                    href={`/manager/jobs/${r.job_name}`}
                    onClick={() => { setSearchOpen(false); setSearch(""); }}
                    className="block px-4 py-3 hover:bg-navy-card/50 transition border-b border-navy-border/30 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-cream text-sm truncate">
                            {r.customer_name || "Unknown"}
                          </span>
                          <span className="text-xs text-gold">#{r.hcp_job_id}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-neutral-700 text-neutral-300"}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {r.address}{r.town ? `, ${r.town}` : ""}
                        </p>
                      </div>
                      {MATCH_LABELS[r.match_field] && (
                        <span className="text-xs text-neutral-600 flex-shrink-0">
                          {MATCH_LABELS[r.match_field]}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {searchOpen && results.length === 0 && search.trim().length >= 2 && !searching && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-navy-surface border border-navy-border rounded-xl shadow-2xl z-50 p-4">
                <p className="text-sm text-neutral-500 text-center">No results found</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <Link
              href="/manager/jobs/new"
              className="bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-4 py-2 rounded-lg text-sm hover:from-gold-light hover:to-gold transition"
            >
              + New Job
            </Link>
            <Link href="/manager/jobs" className="text-sm text-neutral-300 hover:text-gold-light transition">
              All Jobs
            </Link>
            <Link href="/manager/pricing" className="text-sm text-neutral-300 hover:text-gold-light transition">
              Pricing
            </Link>
            <Link href="/manager/admin/invite" className="text-sm text-neutral-300 hover:text-gold-light transition hidden lg:inline" title="Generate magic-link login for office staff">
              Invite
            </Link>
            <Link href="/manager/admin/requests" className="text-sm text-neutral-300 hover:text-gold-light transition hidden lg:inline" title="Review access requests">
              Requests
            </Link>
            <Link href="/manager/admin/approvers" className="text-sm text-neutral-300 hover:text-gold-light transition hidden lg:inline" title="Manage who can approve access requests">
              Approvers
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-red-400 transition"
            >
              Log Out
            </button>
          </div>
        </div>
      </nav>

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
                {loading ? "..." : counts[card.key]}
              </p>
              <p className="text-xs text-neutral-500">{card.description}</p>
              <div
                className={`h-1 rounded-full mt-4 bg-gradient-to-r ${card.color} opacity-60 group-hover:opacity-100 transition`}
              />
            </Link>
          ))}
        </div>

        {/* Placeholder for future widgets */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <h3 className="text-lg font-serif font-bold mb-2">Today&apos;s Activity</h3>
            <p className="text-sm text-neutral-500">
              Coming soon — tech activity, receipts processed, jobs dispatched.
            </p>
          </div>
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <h3 className="text-lg font-serif font-bold mb-2">Inventory Alerts</h3>
            <p className="text-sm text-neutral-500">
              Coming soon — low stock, restock requests, limbo items.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
