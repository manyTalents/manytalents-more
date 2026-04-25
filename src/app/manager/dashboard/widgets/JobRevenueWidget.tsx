"use client";

import { useState, useEffect } from "react";
import WidgetShell from "./WidgetShell";
import { getJobStats } from "@/lib/frappe";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function fmt(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

interface WeekRow {
  label: string;
  revenue: number;
  count: number;
  avg: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-navy-card border border-navy-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-cream/60 mb-1">{label}</p>
      <p className="text-gold font-bold">{fmt(payload[0].value)}</p>
    </div>
  );
}

export default function JobRevenueWidget() {
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobStats(10)
      .then((data) => {
        setWeeks(data.weeks);
        setTotal(data.totals.revenue);
      })
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="Job Revenue" loading={loading}>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <div>
          <p className="text-gold font-bold text-2xl mb-4">{fmt(total)}</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeks} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(240,235,224,0.4)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(240,235,224,0.4)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(201,168,76,0.08)" }} />
              <Bar dataKey="revenue" fill="#c9a84c" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetShell>
  );
}
