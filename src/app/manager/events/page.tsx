"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth } from "@/lib/frappe";
import {
  type MTMEvent,
  type EventCategory,
  type EventSeverity,
  type EventFilters,
  fetchEvents,
  connectEventPolling,
  SEVERITY_COLORS,
  EVENT_TYPE_LABELS,
  relativeTime,
} from "@/lib/events";
import NavBar from "@/app/manager/components/NavBar";

// ── Types ────────────────────────────────────────────────────────────────────

type CategoryFilter = "All" | EventCategory;
type DatePreset = "live" | "today" | "7d" | "30d";
type GroupBy = "time" | "job" | "tech";

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_DOT: Record<EventSeverity, string> = {
  success: "bg-[#28a745]",
  info:    "bg-[#2196F3]",
  warning: "bg-[#E67E22]",
  error:   "bg-[#dc3545]",
};

const SEVERITY_LABEL: Record<EventSeverity, string> = {
  success: "Success",
  info:    "Info",
  warning: "Warning",
  error:   "Error",
};

function datePresetToFilters(preset: DatePreset): { from_date?: string; to_date?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  if (preset === "live") return {};
  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from_date: fmt(start), to_date: fmt(now) };
  }
  if (preset === "7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { from_date: fmt(start), to_date: fmt(now) };
  }
  // 30d
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return { from_date: fmt(start), to_date: fmt(now) };
}

function groupEvents(
  events: MTMEvent[],
  groupBy: GroupBy,
): { key: string; label: string; events: MTMEvent[] }[] {
  if (groupBy === "time") {
    return [{ key: "all", label: "", events }];
  }

  const map = new Map<string, MTMEvent[]>();
  for (const ev of events) {
    const key = groupBy === "job"
      ? (ev.job_id ? `#${ev.job_id}` : "No Job")
      : (ev.tech_name || ev.source || "System");
    const existing = map.get(key) ?? [];
    existing.push(ev);
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([key, evs]) => ({
    key,
    label: key,
    events: evs,
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

export default function EventsPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
  }, [router]);

  // Filters
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [datePreset, setDatePreset] = useState<DatePreset>("live");
  const [eventType, setEventType] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [groupBy, setGroupBy] = useState<GroupBy>("time");
  const [compact, setCompact] = useState(false);
  const [search, setSearch] = useState("");
  const [liveTail, setLiveTail] = useState(true);

  // Data
  const [events, setEvents] = useState<MTMEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const pollerRef = useRef<{ disconnect: () => void } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");

  // Debounce search input
  const handleSearchInput = useCallback((val: string) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  }, []);

  // Build filter object for API
  const buildFilters = useCallback(
    (pageNum: number): EventFilters => {
      const dateFilters = datePresetToFilters(datePreset);
      return {
        ...(category !== "All" ? { category } : {}),
        ...(eventType !== "all" ? { event_type: eventType } : {}),
        ...(severity !== "all" ? { severity } : {}),
        ...(search.trim().length >= 2 ? { search: search.trim() } : {}),
        ...dateFilters,
        page: pageNum,
        page_size: PAGE_SIZE,
      };
    },
    [category, datePreset, eventType, severity, search],
  );

  // Initial + filter-change load
  useEffect(() => {
    setPage(1);
    setEvents([]);
    setLoading(true);
    fetchEvents(buildFilters(1))
      .then((res) => {
        setEvents(res.events);
        setTotalCount(res.total_count);
        setHasMore(res.has_more);
      })
      .catch(() => {
        setEvents([]);
        setTotalCount(0);
        setHasMore(false);
      })
      .finally(() => setLoading(false));
  }, [buildFilters]);

  // Live tail polling
  useEffect(() => {
    pollerRef.current?.disconnect();
    pollerRef.current = null;

    if (!liveTail || datePreset !== "live") return;

    const cat = category === "All" ? undefined : category;
    pollerRef.current = connectEventPolling(
      (fresh) => {
        setEvents((prev) => {
          const merged = [...fresh, ...prev];
          return merged.slice(0, 500);
        });
        setTotalCount((n) => n + fresh.length);
      },
      5000,
      cat,
    );
    return () => {
      pollerRef.current?.disconnect();
      pollerRef.current = null;
    };
  }, [liveTail, datePreset, category]);

  // Load more
  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchEvents(buildFilters(nextPage));
      setEvents((prev) => [...prev, ...res.events]);
      setHasMore(res.has_more);
      setPage(nextPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const groups = groupEvents(events, groupBy);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#080c18]">
      <NavBar />

      {/* Events sub-header */}
      <div className="bg-[#0d1120] border-b border-[#1a1f32]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold tracking-widest text-white uppercase">Events</h2>
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${liveTail && datePreset === "live" ? "bg-green-400" : "bg-neutral-600"}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${liveTail && datePreset === "live" ? "bg-green-500" : "bg-neutral-600"}`} />
              </span>
              {liveTail && datePreset === "live" ? "Live" : "Paused"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {totalCount > 0 && (
              <span className="text-xs text-neutral-500">
                {totalCount.toLocaleString()} event{totalCount !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setLiveTail((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                liveTail
                  ? "bg-green-900/40 text-green-400 hover:bg-green-900/60"
                  : "bg-[#1a1f32] text-neutral-400 hover:text-white"
              }`}
            >
              {liveTail ? "Tail ON" : "Tail OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-navy-surface border-b border-navy-border sticky top-[120px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 space-y-2">
          {/* Row 1: Category + Date presets */}
          <div className="flex flex-wrap items-center gap-2">
            {(["All", "Business", "System"] as CategoryFilter[]).map((c) => (
              <button
                key={c}
                onClick={() => { setCategory(c); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  category === c
                    ? "bg-[#080c18] text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {c}
              </button>
            ))}
            <div className="h-4 w-px bg-neutral-200 mx-1" />
            {(
              [
                { key: "live", label: "Live" },
                { key: "today", label: "Today" },
                { key: "7d", label: "7 days" },
                { key: "30d", label: "30 days" },
              ] as { key: DatePreset; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setDatePreset(key); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  datePreset === key
                    ? "bg-[#c9a84c] text-[#080c18]"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Row 2: Type, Severity, Group By, Compact, Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type */}
            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value); setPage(1); }}
              className="text-xs border border-navy-border rounded-lg px-2.5 py-1.5 bg-navy text-cream focus:outline-none focus:border-[#c9a84c] transition"
            >
              <option value="all">All Types</option>
              {(Object.entries(EVENT_TYPE_LABELS) as [string, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            {/* Severity */}
            <select
              value={severity}
              onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
              className="text-xs border border-navy-border rounded-lg px-2.5 py-1.5 bg-navy text-cream focus:outline-none focus:border-[#c9a84c] transition"
            >
              <option value="all">All Severities</option>
              {(["success", "info", "warning", "error"] as EventSeverity[]).map((s) => (
                <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
              ))}
            </select>

            {/* Group By */}
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="text-xs border border-navy-border rounded-lg px-2.5 py-1.5 bg-navy text-cream focus:outline-none focus:border-[#c9a84c] transition"
            >
              <option value="time">Group: Time</option>
              <option value="job">Group: Job</option>
              <option value="tech">Group: Tech</option>
            </select>

            {/* Compact toggle */}
            <button
              onClick={() => setCompact((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                compact
                  ? "border-[#080c18] bg-[#080c18] text-white"
                  : "border-navy-border bg-navy text-neutral-400 hover:border-neutral-500"
              }`}
            >
              {compact ? "Detail" : "Compact"}
            </button>

            {/* Search */}
            <div className="flex-1 min-w-[160px]">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search events..."
                className="w-full text-xs border border-navy-border rounded-lg px-3 py-1.5 bg-navy text-cream placeholder-neutral-600 focus:outline-none focus:border-[#c9a84c] transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Event list */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg className="w-12 h-12 text-neutral-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-neutral-400 text-sm">No events match your filters</p>
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key}>
                {/* Group header (only when not "time" grouping) */}
                {groupBy !== "time" && (
                  <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
                    <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">
                      {group.label}
                    </span>
                    <span className="text-xs text-neutral-500">
                      ({group.events.length} event{group.events.length !== 1 ? "s" : ""})
                    </span>
                    <div className="flex-1 h-px bg-[#1a1f32]" />
                  </div>
                )}

                {/* Events */}
                <div className="bg-[#0d1120] border border-[#1a1f32] rounded-xl overflow-hidden">
                  {group.events.map((ev, idx) => {
                    const colors = SEVERITY_COLORS[ev.severity];
                    const isLast = idx === group.events.length - 1;
                    return (
                      <div
                        key={ev.name}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-[#111627] transition ${!isLast ? "border-b border-[#1a1f32]" : ""}`}
                        style={{ borderLeft: `3px solid ${colors.border}` }}
                      >
                        {/* Severity dot */}
                        <div className="flex-shrink-0 mt-1.5">
                          <div className={`h-2 w-2 rounded-full ${SEVERITY_DOT[ev.severity]}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`font-medium text-white leading-snug ${compact ? "text-xs" : "text-sm"}`}>
                              {ev.title}
                            </p>
                            <span className="text-[11px] text-neutral-500 flex-shrink-0 mt-0.5">
                              {relativeTime(ev.timestamp)}
                            </span>
                          </div>

                          {!compact && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              <span className="text-[11px] text-[#c9a84c]">
                                {EVENT_TYPE_LABELS[ev.event_type]}
                              </span>
                              {ev.tech_name && (
                                <>
                                  <span className="text-[11px] text-neutral-600">·</span>
                                  <span className="text-[11px] text-neutral-400">{ev.tech_name}</span>
                                </>
                              )}
                              {ev.job_id && (
                                <>
                                  <span className="text-[11px] text-neutral-600">·</span>
                                  <Link
                                    href={`/manager/jobs/${ev.job}`}
                                    className="text-[11px] text-neutral-400 hover:text-[#c9a84c] transition"
                                  >
                                    #{ev.job_id}
                                  </Link>
                                </>
                              )}
                              {ev.source && (
                                <>
                                  <span className="text-[11px] text-neutral-600">·</span>
                                  <span className="text-[11px] text-neutral-500">{ev.source}</span>
                                </>
                              )}
                            </div>
                          )}

                          {!compact && ev.detail && (
                            <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{ev.detail}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 bg-[#0d1120] border border-[#1a1f32] rounded-xl text-sm text-neutral-400 hover:text-white hover:border-[#c9a84c] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more"
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
