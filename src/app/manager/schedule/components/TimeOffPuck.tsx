"use client";

import { TimeOffEntry, approveTimeOff, denyTimeOff } from "@/lib/schedule";
import { useState } from "react";

interface TimeOffPuckProps {
  entry: TimeOffEntry;
  onRefresh: () => void;
}

export default function TimeOffPuck({ entry, onRefresh }: TimeOffPuckProps) {
  const [loading, setLoading] = useState(false);

  const statusStyles: Record<string, string> = {
    Approved: "bg-emerald-950 border-emerald-500 text-emerald-400",
    Denied: "bg-red-950 border-red-500 text-red-400 text-[10px]",
    Pending: "bg-yellow-950 border-yellow-500 text-yellow-400 text-[10px] cursor-pointer",
  };

  const labels: Record<string, string> = {
    Approved: "OFF",
    Denied: "OFF DENIED",
    Pending: "OFF (Pending)",
  };

  const handleClick = async () => {
    if (entry.status !== "Pending" || loading) return;
    const action = window.confirm(
      `Approve time off for ${entry.employee_name} on ${entry.date}?\n\nOK = Approve, Cancel = Deny`
    );
    setLoading(true);
    try {
      if (action) await approveTimeOff(entry.name);
      else await denyTimeOff(entry.name);
      onRefresh();
    } catch (err) {
      console.error("Failed to update time off:", err);
    }
    setLoading(false);
  };

  return (
    <div
      className={`rounded-md px-2.5 py-1.5 mb-1 text-[11px] font-bold text-center tracking-wide border ${statusStyles[entry.status]}`}
      onClick={handleClick}
    >
      {loading ? "..." : labels[entry.status]}
    </div>
  );
}
