"use client";

import { useEffect, useState } from "react";
import {
  fetchWarehouseList,
  type WarehouseCard,
  type WarehouseListResponse,
} from "@/lib/inventory-api";
import { Spinner } from "./Spinner";
import { WarehouseDetail } from "./WarehouseDetail";
import { fmt$$ } from "./utils";

// ── WarehousesTab ─────────────────────────────

export function WarehousesTab() {
  const [data, setData] = useState<WarehouseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<WarehouseCard | null>(null);

  useEffect(() => {
    fetchWarehouseList()
      .then(setData)
      .catch((e: unknown) => {
        console.warn("[WarehousesTab] load error:", e);
        setError(e instanceof Error ? e.message : "Failed to load warehouses.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <WarehouseDetail warehouse={selected} onBack={() => setSelected(null)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-[#dc3545] text-sm">{error || "Failed to load."}</p>;
  }

  const allWarehouses: (WarehouseCard & { badge?: string })[] = [
    ...(data.my_truck ? [{ ...data.my_truck, badge: "MY TRUCK" }] : []),
    ...data.office.map((w) => ({ ...w, badge: "OFFICE" })),
    ...data.other_trucks.map((w) => ({ ...w })),
  ];

  if (allWarehouses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-neutral-400 text-sm">No warehouses found</p>
      </div>
    );
  }

  return (
    <div>
      {/* MY TRUCK hero */}
      {data.my_truck && (
        <div className="mb-6">
          <p className="text-xs text-[#c9a84c] uppercase tracking-widest font-semibold mb-3">My Truck</p>
          <button
            onClick={() => setSelected(data.my_truck!)}
            className="w-full sm:max-w-md text-left bg-gradient-to-br from-[#1a2040] to-[#0d1120] border border-[#c9a84c]/30 rounded-2xl p-6 hover:border-[#c9a84c]/60 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-serif font-bold text-xl text-white">{data.my_truck.display_name || data.my_truck.name}</p>
                <p className="text-xs text-[#c9a84c] uppercase tracking-widest mt-1">My Truck</p>
              </div>
              <svg className="w-8 h-8 text-[#c9a84c]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-white">{data.my_truck.total_items}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Items</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{data.my_truck.total_qty}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Units</p>
              </div>
              <div>
                <p className="text-lg font-bold text-[#c9a84c]">{fmt$$(data.my_truck.total_value)}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Value</p>
              </div>
            </div>
            {data.my_truck.low_stock_count > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#E67E22]" />
                <span className="text-xs text-[#E67E22] font-semibold">{data.my_truck.low_stock_count} items low on stock</span>
              </div>
            )}
          </button>
        </div>
      )}

      {/* Office + Other trucks grid */}
      {(data.office.length > 0 || data.other_trucks.length > 0) && (
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-widest font-semibold mb-3">All Warehouses</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...data.office, ...data.other_trucks].map((w) => (
              <button
                key={w.name}
                onClick={() => setSelected(w)}
                className="text-left bg-[#0d1120] border border-[#1a1f32] rounded-2xl p-5 hover:border-[#c9a84c]/40 hover:-translate-y-0.5 transition-all"
              >
                <p className="font-serif font-semibold text-white mb-1">{w.display_name || w.name}</p>
                <div className="grid grid-cols-3 gap-2 text-center mt-3">
                  <div>
                    <p className="text-lg font-bold text-white">{w.total_items}</p>
                    <p className="text-[10px] text-neutral-500">Items</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{w.total_qty}</p>
                    <p className="text-[10px] text-neutral-500">Units</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#c9a84c]">{fmt$$(w.total_value)}</p>
                    <p className="text-[10px] text-neutral-500">Value</p>
                  </div>
                </div>
                {w.low_stock_count > 0 && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E67E22]" />
                    <span className="text-[11px] text-[#E67E22]">{w.low_stock_count} low</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
