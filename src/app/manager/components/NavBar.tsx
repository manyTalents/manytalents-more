"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearAuth } from "@/lib/frappe";
import EventBadge from "./EventBadge";
import EventPanel from "./EventPanel";

const NAV_LINKS = [
  { href: "/manager/dashboard", label: "Dashboard" },
  { href: "/manager/jobs", label: "All Jobs" },
  { href: "/manager/pricing", label: "Pricing" },
  { href: "/manager/inventory", label: "Inventory" },
] as const;

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [eventPanelOpen, setEventPanelOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    clearAuth();
    router.replace("/manager");
  };

  const isActive = (href: string) => {
    if (href === "/manager/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
      <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand */}
          <Link href="/manager/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-lg font-serif font-extrabold">
              Many<span className="text-gold-gradient">Talents</span>
            </h1>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_LINKS.map((link) => (
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
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/manager/jobs/new"
              className="bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-3 py-1.5 rounded-lg text-sm hover:from-gold-light hover:to-gold transition"
            >
              + New Job
            </Link>
            <EventBadge onClick={() => setEventPanelOpen(true)} />
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-500 hover:text-red-400 transition hidden sm:inline px-2 py-1"
            >
              Log Out
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
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

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-navy-border bg-navy-surface px-4 py-3 space-y-1">
            {NAV_LINKS.map((link) => (
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
