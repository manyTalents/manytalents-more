"use client";

import { useState, useEffect } from "react";
import WidgetShell from "./WidgetShell";
import { getTeamStats } from "@/lib/frappe";

interface TechRow {
  name: string;
  initials: string;
  revenue: number;
  job_count: number;
  hours_clocked: number;
  hours_billable: number;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function firstName(fullName: string): string {
  return fullName.split(" ")[0];
}

export default function TeamLeaderboardWidget() {
  const [techs, setTechs] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTeamStats("weekly")
      .then((data) => {
        const sorted = [...data.techs].sort((a, b) => b.revenue - a.revenue);
        setTechs(sorted);
      })
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const maxRevenue = techs[0]?.revenue ?? 1;

  return (
    <WidgetShell title="Team This Week" loading={loading}>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : techs.length === 0 ? (
        <p className="text-cream/40 text-sm">No data yet.</p>
      ) : (
        <div className="space-y-4">
          {techs.map((tech, idx) => {
            const barPct = maxRevenue > 0 ? (tech.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={tech.name} className="flex items-start gap-3">
                {/* Rank + initials */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-navy"
                    style={{ backgroundColor: "#c9a84c" }}
                    aria-label={tech.name}
                  >
                    {tech.initials}
                  </div>
                  {idx === 0 && (
                    <span className="text-[9px] font-bold text-gold/70 uppercase tracking-wider">Top</span>
                  )}
                </div>

                {/* Bar + labels */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-cream text-sm font-semibold truncate">
                      {firstName(tech.name)}
                    </span>
                    <span className="text-gold text-sm font-bold flex-shrink-0 ml-2">
                      {fmt(tech.revenue)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-navy-card rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: "#c9a84c",
                        opacity: idx === 0 ? 1 : 0.55 + (0.45 * (1 - idx / Math.max(techs.length - 1, 1))),
                      }}
                      role="progressbar"
                      aria-valuenow={Math.round(barPct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>

                  <p className="text-cream/35 text-xs mt-1">
                    {tech.job_count} job{tech.job_count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetShell>
  );
}
