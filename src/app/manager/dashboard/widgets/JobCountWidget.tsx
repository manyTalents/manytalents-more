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
      <p className="text-[#1a73e8] font-bold">{payload[0].value} jobs</p>
    </div>
  );
}

export default function JobCountWidget() {
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJobStats(10)
      .then((data) => {
        setWeeks(data.weeks);
        setTotal(data.totals.count);
      })
      .catch((err) => setError(err.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetShell title="Jobs Completed" loading={loading}>
      {error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <div>
          <p className="text-cream font-bold text-2xl mb-4">
            {total} <span className="text-cream/50 text-base font-normal">jobs</span>
          </p>
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
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(26,115,232,0.08)" }} />
              <Bar dataKey="count" fill="#1a73e8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetShell>
  );
}
