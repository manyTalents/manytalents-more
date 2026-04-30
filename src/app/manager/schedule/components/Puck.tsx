"use client";

import { SchedulePuck, formatTimeRange, getTrade } from "@/lib/schedule";

const TRADE_COLORS = {
  plumbing: { border: "#3b82f6", icon: "💧" },
  hvac: { border: "#38bdf8", icon: "❄️" },
  electrical: { border: "#facc15", icon: "⚡" },
  other: { border: "#6b7280", icon: "🔧" },
} as const;

interface PuckProps {
  job: SchedulePuck;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function Puck({ job, onClick, draggable = true, onDragStart }: PuckProps) {
  const trade = getTrade(job.job_type);
  const { border, icon } = TRADE_COLORS[trade];
  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })
    : "";
  const timeRange = formatTimeRange(job.scheduled_start_time, job.scheduled_end_time);
  const street = job.address?.split(",")[0] || job.address || "";

  return (
    <div
      className="bg-[#0f1729] border border-[#2a3a4e] rounded-md px-2 py-1.5 mb-1 cursor-grab hover:border-[#c9a84c] hover:shadow-[0_0_8px_rgba(201,168,76,0.15)] hover:-translate-y-px transition-all active:cursor-grabbing active:opacity-80 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2"
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <div className="min-w-0">
        <div className="text-[#f5f0e8] font-semibold text-xs leading-tight truncate">{job.customer_name}</div>
        <div className="text-[#354a61] text-[11px] leading-tight truncate">{street}</div>
      </div>
      <div className="text-center">
        <div className="text-[#f5f0e8] text-[11px] font-medium leading-tight">{dateStr}</div>
        <div className="text-[#e0c878] text-[11px] font-bold leading-tight">{timeRange}</div>
      </div>
      <div className="text-right">
        <span className="text-sm leading-none">{icon}</span>
        <span className="block text-[10px] text-[#354a61] font-medium">#{job.job_number}</span>
      </div>
    </div>
  );
}
