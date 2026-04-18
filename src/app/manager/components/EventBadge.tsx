"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchEventStats } from "@/lib/events";

export default function EventBadge({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const stats = await fetchEventStats();
      setCount(stats.last_hour);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <button
      onClick={onClick}
      className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5"
      title="Events"
    >
      <svg
        className="w-5 h-5 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span className="text-xs text-neutral-400 hidden sm:inline">Events</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-[#E67E22] text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
