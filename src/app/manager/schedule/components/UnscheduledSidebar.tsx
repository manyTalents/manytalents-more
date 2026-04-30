"use client";

import { useState } from "react";
import { SchedulePuck, getTrade } from "@/lib/schedule";
import Puck from "./Puck";

interface UnscheduledSidebarProps {
  jobs: SchedulePuck[];
  onRefresh: () => void;
}

const TRADES = ["all", "plumbing", "hvac", "electrical"] as const;

export default function UnscheduledSidebar({ jobs, onRefresh }: UnscheduledSidebarProps) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? jobs : jobs.filter((j) => getTrade(j.job_type) === filter);

  const handleDragStart = (e: React.DragEvent, job: SchedulePuck) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ jobName: job.name }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-[260px] min-w-[260px] bg-[#1a2332] border-r border-[#2a3a4e] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#2a3a4e]">
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#c9a84c] mb-2">Unscheduled Jobs</div>
        <div className="flex gap-1">
          {TRADES.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-xl text-[11px] border transition-all ${
                filter === t ? "bg-[#c9a84c] text-[#0f1729] border-[#c9a84c]" : "border-[#2a3a4e] text-[#f5f0e8] opacity-70 hover:opacity-100"
              }`}>
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-center text-[#f5f0e8]/40 text-xs mt-8">No unscheduled jobs</div>
        ) : (
          filtered.map((job) => (
            <Puck key={job.name} job={job} onDragStart={(e) => handleDragStart(e, job)} />
          ))
        )}
      </div>
    </aside>
  );
}
