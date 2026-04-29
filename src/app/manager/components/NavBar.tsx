"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearAuth, globalSearch, type SearchResult } from "@/lib/frappe";
import { getFeatureFlags, fetchFeatureFlags, FLAG_TO_NAV } from "@/lib/features";
import EventBadge from "./EventBadge";
import EventPanel from "./EventPanel";

const NAV_LINKS = [
  { href: "/manager/dashboard", label: "Dashboard" },
  { href: "/manager/jobs", label: "All Jobs" },
  { href: "/manager/pricing", label: "Pricing" },
  { href: "/manager/invoices", label: "Invoices" },
  { href: "/manager/customers", label: "Customers" },
  { href: "/manager/estimates", label: "Estimates" },
  { href: "/manager/service-plans", label: "Service Plans" },
  { href: "/manager/inventory", label: "Inventory" },
  { href: "/manager/admin/techs", label: "Team" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  Entered: "bg-neutral-700 text-neutral-300",
  Scheduled: "bg-blue-900/60 text-blue-300",
  Assigned: "bg-indigo-900/60 text-indigo-300",
  "In Progress": "bg-cyan-900/60 text-cyan-300",
  "On Hold": "bg-amber-900/60 text-amber-300",
  Completed: "bg-orange-900/60 text-orange-300",
  "Needs Check": "bg-purple-900/60 text-purple-300",
  Checked: "bg-blue-900/60 text-blue-300",
  Invoiced: "bg-amber-900/60 text-amber-300",
  Paid: "bg-emerald-900/60 text-emerald-300",
  Canceled: "bg-red-900/60 text-red-300",
};

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [eventPanelOpen, setEventPanelOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flags, setFlags] = useState(getFeatureFlags());

  useEffect(() => { fetchFeatureFlags().then(setFlags).catch(() => {}); }, []);

  // Search state
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    clearAuth();
    router.replace("/manager");
  };

  const isActive = (href: string) => {
    if (href === "/manager/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    clearTimeout(searchTimer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearchOpen(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await globalSearch(q);
        setResults(r);
        setSearchOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on navigate
  useEffect(() => {
    setSearchOpen(false);
    setSearch("");
  }, [pathname]);

  return (
    <>
      <nav aria-label="Main navigation" className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link href="/manager/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-lg font-serif font-extrabold">
              Many<span className="text-gold-gradient">Talents</span>
            </h1>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {(() => {
              const visibleLinks = NAV_LINKS.filter((link) => {
                const flagKey = FLAG_TO_NAV[link.href];
                if (!flagKey) return true;
                return flags[flagKey];
              });
              return visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive(link.href)
                      ? "bg-gold-dark/20 text-gold"
                      : "text-neutral-400 hover:text-cream hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ));
            })()}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/manager/jobs/new"
              className="bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-3 py-1.5 rounded-lg text-sm hover:from-gold-light hover:to-gold transition"
            >
              + New Job
            </Link>
            {flags.events && <EventBadge onClick={() => setEventPanelOpen(true)} />}
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-500 hover:text-red-400 transition hidden sm:inline px-2 py-1"
            >
              Log Out
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition"
            >
              <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3" ref={searchRef}>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search jobs — customer, address, job #..."
              className="w-full bg-navy border border-navy-border rounded-lg px-4 py-2 text-sm text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
            />
            {searching && (
              <div className="absolute right-3 top-2.5">
                <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            )}

            {/* Results dropdown */}
            {searchOpen && results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-navy-surface border border-navy-border rounded-xl shadow-2xl max-h-96 overflow-y-auto z-50">
                {results.map((r) => (
                  <Link
                    key={r.job_name}
                    href={`/manager/jobs/${r.job_name}`}
                    onClick={() => { setSearchOpen(false); setSearch(""); }}
                    className="block px-4 py-3 hover:bg-white/5 border-b border-navy-border last:border-0 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.customer_name || "Unknown"}</span>
                          <span className="text-xs text-gold">#{r.hcp_job_id}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLORS[r.status] || "bg-neutral-700 text-neutral-300"}`}>
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">{r.address}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {searchOpen && search.trim().length >= 2 && results.length === 0 && !searching && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-navy-surface border border-navy-border rounded-xl shadow-2xl z-50 px-4 py-3">
                <p className="text-sm text-neutral-500">No results for &ldquo;{search}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-navy-border bg-navy-surface px-4 py-3 space-y-1">
            {NAV_LINKS.filter((link) => {
              const flagKey = FLAG_TO_NAV[link.href];
              if (!flagKey) return true;
              return flags[flagKey];
            }).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive(link.href)
                    ? "bg-gold-dark/20 text-gold"
                    : "text-neutral-400 hover:text-cream hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-500 hover:text-red-400 transition"
            >
              Log Out
            </button>
          </div>
        )}
      </nav>

      <EventPanel isOpen={eventPanelOpen} onClose={() => setEventPanelOpen(false)} />
    </>
  );
}
