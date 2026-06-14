"use client";

import { useState } from "react";
import type { ItemDestination } from "@/lib/inventory-api";
import { DESTINATIONS, TRUCKS } from "./utils";

// ── DestButtons ───────────────────────────────

interface DestButtonsProps {
  current: ItemDestination;
  currentTruck?: string;
  hasJob: boolean;
  onSelect: (d: ItemDestination, truck?: string) => void;
  disabled?: boolean;
}

export function DestButtons({ current, currentTruck, hasJob, onSelect, disabled }: DestButtonsProps) {
  const [truckOpen, setTruckOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-1">
      {DESTINATIONS.map((d) => {
        if (d === "This Job" && !hasJob) return null;
        const active = current === d;

        if (d === "Truck") {
          return (
            <div key={d} className="relative">
              <button
                disabled={disabled}
                onClick={() => setTruckOpen((v) => !v)}
                className={`min-h-[32px] px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap
                  ${active
                    ? "bg-[#c9a84c] text-[#080c18]"
                    : "bg-[#1a1f32] text-neutral-400 hover:text-white hover:bg-[#1e2540]"
                  } disabled:opacity-40`}
              >
                {active && currentTruck ? currentTruck.replace("'s Truck", "").replace(" Truck", "") : "Truck"} {truckOpen ? "▲" : "▾"}
              </button>
              {truckOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-[#0d1120] border border-[#1a1f32] rounded-lg shadow-xl min-w-[160px] max-h-[240px] overflow-y-auto">
                  {TRUCKS.map((t) => (
                    <button
                      key={t}
                      onClick={() => { onSelect("Truck", t); setTruckOpen(false); }}
                      className={`block w-full text-left px-3 py-2 text-xs transition
                        ${currentTruck === t
                          ? "text-[#c9a84c] bg-[#111627]"
                          : "text-neutral-300 hover:bg-[#111627] hover:text-[#c9a84c]"
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={d}
            disabled={disabled}
            onClick={() => onSelect(d)}
            className={`min-h-[32px] px-2 py-1 rounded text-[11px] font-semibold transition whitespace-nowrap
              ${active
                ? d === "Limbo"
                  ? "bg-[#E67E22]/20 text-[#E67E22] border border-[#E67E22]/50"
                  : "bg-[#c9a84c] text-[#080c18]"
                : "bg-[#1a1f32] text-neutral-400 hover:text-white hover:bg-[#1e2540]"
              } disabled:opacity-40`}
          >
            {d}
          </button>
        );
      })}
    </div>
  );
}
