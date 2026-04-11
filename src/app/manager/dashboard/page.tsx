"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, clearAuth, getWorkflowCounts, type WorkflowCounts } from "@/lib/frappe";

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
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-serif font-extrabold">
              Many<span className="text-gold-gradient">Talents</span> Manager
            </h1>
            <span className="text-xs text-neutral-500 uppercase tracking-wider hidden sm:inline">
              Office Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/manager/jobs"
              className="text-sm text-neutral-300 hover:text-gold-light transition"
            >
              All Jobs
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
