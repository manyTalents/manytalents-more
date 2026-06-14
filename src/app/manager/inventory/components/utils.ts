// ──────────────────────────────────────────────
// Shared utility helpers + constants
// ──────────────────────────────────────────────

import type { ItemDestination } from "@/lib/inventory-api";

// ── Types ─────────────────────────────────────

export type MainTab = "receipts" | "warehouses" | "limbo" | "restock" | "matches";
export type StatusFilter = "" | "Pending" | "Complete" | "Failed";
export type ViewMode = "table" | "cards";

// ── Constants ─────────────────────────────────

export const STATUS_DOT: Record<string, string> = {
  Complete: "bg-[#28a745]",
  Pending: "bg-[#E67E22]",
  Failed: "bg-[#dc3545]",
};

export const STATUS_TEXT: Record<string, string> = {
  Complete: "text-[#28a745]",
  Pending: "text-[#E67E22]",
  Failed: "text-[#dc3545]",
};

export const DESTINATIONS: ItemDestination[] = [
  "This Job",
  "Truck",
  "Office",
  "Limbo",
  "Diff Job",
  "Returned",
  "Lost",
];

export const TRUCKS = [
  "Chris's Truck",
  "Warrens Truck",
  "Adam's Truck",
  "Tim's Truck",
  "Glen's Truck",
  "Dereck's Truck",
  "Matt's Truck",
];

export const PAGE_SIZE = 25;

export const TRADES = ["Plumbing", "Electrical", "HVAC", "General"] as const;
export type Trade = (typeof TRADES)[number];

// ── Formatters ────────────────────────────────

export function fmt$$(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtDate(s: string): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join("")
    .slice(0, 2);
}

// ── Score / match colour helpers ──────────────

export function matchColor(score: number): string {
  if (score >= 90) return "text-[#28a745]";
  if (score >= 70) return "text-[#E67E22]";
  return "text-[#dc3545]";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-[#28a745]";
  if (score >= 50) return "text-[#E67E22]";
  return "text-[#dc3545]";
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-[#28a745]/10 border-[#28a745]/30";
  if (score >= 50) return "bg-[#E67E22]/10 border-[#E67E22]/30";
  return "bg-[#dc3545]/10 border-[#dc3545]/30";
}
