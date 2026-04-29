"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, getPlanTemplates, type PlanTemplate } from "@/lib/frappe";
import { getFeatureFlags } from "@/lib/features";
import NavBar from "@/app/manager/components/NavBar";

// ── Helpers ────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TRADE_COLORS: Record<string, string> = {
  Plumbing: "bg-blue-900/50 text-blue-300 border-blue-800/60",
  HVAC: "bg-amber-900/50 text-amber-300 border-amber-800/60",
  Electrical: "bg-yellow-900/50 text-yellow-300 border-yellow-800/60",
  General: "bg-neutral-700/50 text-neutral-300 border-neutral-600/60",
};

function TradeBadge({ trade }: { trade: string }) {
  const cls = TRADE_COLORS[trade] ?? TRADE_COLORS.General;
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded border ${cls}`}>
      {trade}
    </span>
  );
}

// ── Template Card ──────────────────────────────────────────

function TemplateCard({ template }: { template: PlanTemplate }) {
  return (
    <div className="bg-navy-surface border border-navy-border rounded-2xl p-6 flex flex-col gap-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-cream leading-tight">{template.name_label}</h3>
          <div className="mt-1.5">
            <TradeBadge trade={template.trade} />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-serif font-bold text-gold">{fmtCurrency(template.price)}</p>
          <p className="text-xs text-neutral-500 mt-0.5">per year</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 border-t border-navy-border pt-4">
        <div>
          <p className="text-xs text-neutral-500 mb-0.5">Interval</p>
          <p className="text-sm font-semibold text-cream">
            {template.service_interval_months} mo
          </p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-0.5">Visits / Yr</p>
          <p className="text-sm font-semibold text-cream">{template.visits_per_year}</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-0.5">Billing</p>
          <p className="text-sm font-semibold text-cream capitalize">{template.billing_cadence}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function ServicePlanTemplatesPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    if (!getFeatureFlags().service_plans) { router.replace("/manager/dashboard"); return; }
    getPlanTemplates()
      .then((res) => setTemplates(res.templates || []))
      .catch((err: any) => setError(err.message || "Failed to load templates"))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link
                href="/manager/service-plans"
                className="text-sm text-cream/50 hover:text-cream transition"
              >
                &larr; Service Plans
              </Link>
            </div>
            <h1 className="text-2xl font-serif font-bold text-cream">Plan Templates</h1>
            {!loading && (
              <p className="text-xs text-neutral-500 mt-0.5">
                {templates.length} template{templates.length !== 1 ? "s" : ""} available &middot; read-only
              </p>
            )}
          </div>
        </div>

        {/* Notice */}
        <div className="bg-navy-surface border border-navy-border rounded-xl px-5 py-3.5 mb-6 flex items-start gap-3">
          <svg className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-neutral-400">
            Templates define the structure of a service plan. To create or edit templates, use the ERPNext backend.
            Creating new plan instances is done from the{" "}
            <Link href="/manager/service-plans" className="text-gold hover:text-gold-light transition">
              Service Plans
            </Link>{" "}
            page.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-navy-surface border border-navy-border rounded-2xl px-6 py-16 text-center">
            <p className="text-neutral-400 text-sm">No plan templates found.</p>
            <p className="text-neutral-600 text-xs mt-2">
              Add templates through the ERPNext Service Plan Template doctype.
            </p>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <TemplateCard key={t.name} template={t} />
            ))}
          </div>
        )}

        <div className="pb-8" />
      </main>
    </div>
  );
}
