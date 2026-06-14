"use client";

import { useState } from "react";
import type { TruckPullList, PullListItem } from "@/lib/inventory-api";
import { Spinner } from "./Spinner";

// ── TruckSection ──────────────────────────────

interface TruckSectionProps {
  truck: TruckPullList;
  onPullItem: (item: PullListItem) => Promise<void>;
  onPullAll: (truck: TruckPullList) => Promise<void>;
  pullingItems: Record<string, boolean>;
  pullingAll: Record<string, boolean>;
}

export function TruckSection({ truck, onPullItem, onPullAll, pullingItems, pullingAll }: TruckSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pendingItems = truck.items.filter((i) => i.status === "Pending");

  return (
    <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#111627] transition text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-serif font-bold text-white text-base leading-tight">
            {truck.label || truck.warehouse}
          </p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-neutral-500">
            {truck.pending_count > 0 && (
              <span className="text-[#E67E22] font-semibold">{truck.pending_count} pending</span>
            )}
            {truck.pulled_count > 0 && (
              <span className="text-[#28a745] font-semibold">{truck.pulled_count} pulled</span>
            )}
            {truck.rejected_count > 0 && (
              <span className="text-[#dc3545] font-semibold">{truck.rejected_count} rejected</span>
            )}
          </div>
        </div>
        <span className="text-xs text-neutral-500 flex-shrink-0">
          {truck.items.length} item{truck.items.length !== 1 ? "s" : ""}
        </span>
        <svg
          className={`w-4 h-4 text-neutral-500 flex-shrink-0 transition-transform ${collapsed ? "-rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-[#1a1f32]">
          {truck.items.filter((i) => i.status !== "Rejected" && i.status !== "Ignored").map((item, idx) => {
            const visibleItems = truck.items.filter((i) => i.status !== "Rejected" && i.status !== "Ignored");
            const isLast = idx === visibleItems.length - 1;
            const isPulled = item.status === "Pulled" || item.status === "Accepted";
            const isPending = item.status === "Pending";

            return (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-5 py-3.5 ${!isLast ? "border-b border-[#1a1f32]" : ""} ${
                  isPulled ? "opacity-60" : "hover:bg-[#111627]"
                } transition`}
              >
                {/* Checkbox visual (reflects status, not interactive) */}
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                  isPulled
                    ? "bg-[#28a745] border-[#28a745]"
                    : "border-[#2a3050] bg-transparent"
                }`}>
                  {isPulled && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#f0ebe0] font-medium leading-tight">
                    {item.item_name}
                    {item.source_job_id && (
                      <span className="ml-2 text-[11px] text-[#c9a84c] font-mono">#{item.source_job_id}</span>
                    )}
                  </p>
                  {item.pulled_by && isPulled && (
                    <p className="text-[11px] text-neutral-500 mt-0.5">by {item.pulled_by}</p>
                  )}
                </div>

                {/* Qty */}
                <span className="text-sm font-mono text-neutral-400 flex-shrink-0">
                  x{item.required_qty}
                </span>

                {/* Action */}
                <div className="flex-shrink-0">
                  {isPulled ? (
                    <span className="text-xs font-bold text-[#28a745] flex items-center gap-1">
                      PULLED
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : isPending ? (
                    <button
                      onClick={() => onPullItem(item)}
                      disabled={!!pullingItems[item.name]}
                      className="min-h-[32px] px-3 py-1 bg-gradient-to-br from-[#c9a84c] to-[#a8893d] text-[#080c18] font-bold rounded-lg text-xs hover:from-[#e0c068] hover:to-[#c9a84c] transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {pullingItems[item.name] ? <Spinner size="sm" /> : "PULL"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          {/* Pull all footer */}
          {pendingItems.length > 1 && (
            <div className="px-5 py-3 border-t border-[#1a1f32] flex justify-end">
              <button
                onClick={() => onPullAll(truck)}
                disabled={!!pullingAll[truck.warehouse]}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1f32] text-neutral-300 hover:text-[#c9a84c] hover:border-[#c9a84c]/40 border border-[#1a1f32] rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                {pullingAll[truck.warehouse] ? <Spinner size="sm" /> : null}
                PULL ALL AVAILABLE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
