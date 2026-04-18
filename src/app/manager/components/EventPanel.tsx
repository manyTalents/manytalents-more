"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  type MTMEvent,
  type EventCategory,
  type EventSeverity,
  fetchRecentEvents,
  connectEventPolling,
  SEVERITY_COLORS,
  EVENT_TYPE_LABELS,
  relativeTime,
} from "@/lib/events";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SEVERITY_DOT: Record<EventSeverity, string> = {
  success: "bg-[#28a745]",
  info:    "bg-[#2196F3]",
  warning: "bg-[#E67E22]",
  error:   "bg-[#dc3545]",
};

type FilterChip = "All" | EventCategory;

export default function EventPanel({ isOpen, onClose }: Props) {
  const [events, setEvents] = useState<MTMEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterChip>("All");
  const pollerRef = useRef<{ disconnect: () => void } | null>(null);

  // Load initial events whenever the panel opens or the filter changes
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const category = filter === "All" ? undefined : filter;
    fetchRecentEvents(30, category)
      .then((data) => setEvents(data))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [isOpen, filter]);

  // Start live polling while panel is open
  useEffect(() => {
    if (!isOpen) {
      pollerRef.current?.disconnect();
      pollerRef.current = null;
      return;
    }
    const category = filter === "All" ? undefined : filter;
    pollerRef.current = connectEventPolling(
      (fresh) => setEvents((prev) => [...fresh, ...prev].slice(0, 100)),
      5000,
      category,
    );
    return () => {
      pollerRef.current?.disconnect();
      pollerRef.current = null;
    };
  }, [isOpen, filter]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const CHIPS: FilterChip[] = ["All", "Business", "System"];

  return (
      {/* Panel — no overlay, coexists with page content */}
      <div
        className="fixed right-0 top-0 h-full w-80 bg-white shadow-[-4px_0_12px_rgba(0,0,0,0.15)] z-40 flex flex-col border-l border-neutral-200"
        role="dialog"
        aria-label="Events panel"
      >
        {/* Header */}
        <div className="bg-[#080c18] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold tracking-widest text-white uppercase">
              Events
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition p-1 rounded"
            aria-label="Close events panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 px-3 py-2 border-b border-neutral-100 flex-shrink-0">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setFilter(chip)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                filter === chip
                  ? "bg-[#080c18] text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
            </div>
          )}
          {!loading && events.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <svg className="w-10 h-10 text-neutral-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm text-neutral-400">No events yet</p>
            </div>
          )}
          {!loading && events.map((event) => {
            const colors = SEVERITY_COLORS[event.severity];
            return (
              <div
                key={event.name}
                className="px-3 py-2.5 border-b border-neutral-100 hover:bg-neutral-50 transition"
                style={{ borderLeft: `3px solid ${colors.border}` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-neutral-800 leading-snug flex-1">
                    {event.title}
                  </p>
                  <span className="text-[10px] text-neutral-400 flex-shrink-0 mt-0.5">
                    {relativeTime(event.timestamp)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-neutral-400">
                    {EVENT_TYPE_LABELS[event.event_type]}
                  </span>
                  {event.tech_name && (
                    <>
                      <span className="text-[10px] text-neutral-300">·</span>
                      <span className="text-[10px] text-neutral-500">{event.tech_name}</span>
                    </>
                  )}
                  {event.job_id && (
                    <>
                      <span className="text-[10px] text-neutral-300">·</span>
                      <span className="text-[10px] text-neutral-500">#{event.job_id}</span>
                    </>
                  )}
                </div>
                {event.detail && (
                  <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{event.detail}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-4 py-3 flex-shrink-0">
          <Link
            href="/manager/events"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#080c18] hover:text-[#c9a84c] transition uppercase tracking-wider"
          >
            Full Page
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
  );
}

// Re-export SEVERITY_DOT for use in the events page
export { SEVERITY_DOT };
