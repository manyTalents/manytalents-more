"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import WidgetShell from "./WidgetShell";
import { getPlansDue } from "@/lib/frappe";

interface PlanDue {
  name: string;
  template_name: string;
  customer_name: string;
  address: string;
  next_service_date: string;
  days_until: number;
}

const MAX_ROWS = 8;

function urgencyClass(days: number): string {
  if (days <= 2) return "bg-red-900/60 text-red-300";
  if (days <= 7) return "bg-amber-900/60 text-amber-300";
  return "bg-blue-900/60 text-blue-300";
}

export default function ServicePlansDueWidget() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlansDue(14)
      .then((data) => setPlans((data.plans ?? []).slice(0, MAX_ROWS)))
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell
      title={`Service Plans Due (${loading ? "…" : plans.length})`}
      loading={loading}
    >
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : plans.length === 0 ? (
        <p className="text-cream/40 text-sm italic">No plans due.</p>
      ) : (
        <ul className="divide-y divide-navy-border">
          {plans.map((plan) => (
            <li key={plan.name}>
              <button
                onClick={() => router.push(`/manager/service-plans/${plan.name}`)}
                className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-navy-card/50 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold px-1"
                aria-label={`${plan.customer_name} — ${plan.template_name}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-cream text-sm font-medium truncate">
                    {plan.template_name}
                  </p>
                  <p className="text-cream/40 text-xs truncate">
                    {plan.customer_name} · {plan.address}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${urgencyClass(plan.days_until)}`}
                >
                  {plan.days_until === 0
                    ? "today"
                    : `in ${plan.days_until}d`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}
