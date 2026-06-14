"use client";

import { useEffect, useState } from "react";
import {
  fetchLimboItems,
  dispatchItems,
  type LimboGroup,
  type ReceiptItem,
  type ItemDestination,
} from "@/lib/inventory-api";
import { ReceiptThumbnail } from "@/app/manager/inventory/ReceiptImageViewer";
import { Spinner } from "./Spinner";
import { DestButtons } from "./DestButtons";
import { SendButton } from "./SendButton";
import { fmt$$, matchColor } from "./utils";

// ── LimboTab ──────────────────────────────────

export function LimboTab() {
  const [groups, setGroups] = useState<LimboGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dests, setDests] = useState<Record<string, ItemDestination>>({});
  const [truckDests, setTruckDests] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    fetchLimboItems()
      .then((res) => {
        setGroups(res.groups || []);
        const initDests: Record<string, ItemDestination> = {};
        for (const g of res.groups || []) {
          for (const it of g.items) {
            initDests[it.name] = it.destination || "Limbo";
          }
        }
        setDests(initDests);
      })
      .catch((e: unknown) => {
        console.warn("[LimboTab] load error:", e);
        setError(e instanceof Error ? e.message : "Failed to load limbo items.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (item: ReceiptItem, jobName: string) => {
    const dest = dests[item.name] || "Limbo";
    if (dest === "Truck" && !truckDests[item.name]) {
      showToast("Select which truck first.");
      return;
    }
    setSending((s) => ({ ...s, [item.name]: true }));
    try {
      await dispatchItems(jobName || "", [{
        item_name: item.name,
        destination: dest,
        ...(dest === "Truck" && truckDests[item.name] ? { target_warehouse: truckDests[item.name] } : {}),
      }]);
      setSent((s) => ({ ...s, [item.name]: true }));
      showToast("Dispatched.");
    } catch (e: unknown) {
      console.warn("[LimboTab] handleSend error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSending((s) => ({ ...s, [item.name]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="text-[#dc3545] text-sm">{error}</p>;
  }

  const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 rounded-full bg-[#28a745]/10 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#28a745]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <p className="text-white font-semibold mb-1">Limbo is clear</p>
        <p className="text-neutral-400 text-sm">All items have been dispatched.</p>
      </div>
    );
  }

  return (
    <div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1120] border border-[#c9a84c]/50 text-[#c9a84c] text-sm px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      <p className="text-xs text-[#E67E22] font-semibold uppercase tracking-wider mb-5">
        {totalItems} item{totalItems !== 1 ? "s" : ""} in limbo
      </p>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.receipt_name}>
            {/* Group header */}
            <div className="flex items-center gap-3 mb-3">
              <ReceiptThumbnail
                receiptFile={group.receipt_file}
                items={group.items}
                supplier={group.supplier}
                receiptName={group.receipt_name}
              />
              <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-wider">
                {group.supplier || group.receipt_name}
              </span>
              {group.hcp_job_id && (
                <span className="text-xs text-neutral-500 font-mono">#{group.hcp_job_id}</span>
              )}
              <div className="flex-1 h-px bg-[#1a1f32]" />
              <span className="text-xs text-neutral-500">{group.items.length} item{group.items.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
              {group.items.map((item, idx) => (
                <div
                  key={item.name}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4 ${
                    idx < group.items.length - 1 ? "border-b border-[#1a1f32]" : ""
                  } ${sent[item.name] ? "opacity-50" : ""} hover:bg-[#111627] transition`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm">{item.matched_item_name || item.description}</p>
                    {item.product_code && (
                      <p className="text-[11px] text-neutral-500 font-mono">{item.product_code}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500">
                      <span>Qty: {item.quantity}</span>
                      <span>{fmt$$(item.unit_price)}</span>
                      {item.match_score > 0 && (
                        <span className={matchColor(item.match_score)}>
                          {Math.round(item.match_score)}% match
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <DestButtons
                      current={dests[item.name] || "Limbo"}
                      currentTruck={truckDests[item.name]}
                      hasJob={!!group.hcp_job}
                      onSelect={(d, truck) => {
                        setDests((prev) => ({ ...prev, [item.name]: d }));
                        if (truck) setTruckDests((prev) => ({ ...prev, [item.name]: truck }));
                      }}
                      disabled={!!sent[item.name]}
                    />
                  </div>

                  <SendButton
                    onClick={() => handleSend(item, group.hcp_job)}
                    loading={!!sending[item.name]}
                    done={!!sent[item.name]}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
