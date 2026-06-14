"use client";

import { useEffect, useState } from "react";
import {
  fetchReceiptDetail,
  dispatchItems,
  dispatchAllToJob,
  type ReceiptDetail,
  type ReceiptItem,
  type DispatchItemInput,
  type ItemDestination,
} from "@/lib/inventory-api";
import { ReceiptThumbnail } from "@/app/manager/inventory/ReceiptImageViewer";
import { Spinner } from "./Spinner";
import { DestButtons } from "./DestButtons";
import { SendButton } from "./SendButton";
import { fmt$$, fmtDate, initials, matchColor } from "./utils";
import type { ViewMode } from "./utils";

// ── DispatchView ──────────────────────────────

interface DispatchViewProps {
  receiptName: string;
  onBack: () => void;
}

export function DispatchView({ receiptName, onBack }: DispatchViewProps) {
  const [detail, setDetail] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [dests, setDests] = useState<Record<string, ItemDestination>>({});
  const [truckDests, setTruckDests] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [allChecked, setAllChecked] = useState(false);
  const [dispatchingAll, setDispatchingAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    setLoading(true);
    fetchReceiptDetail(receiptName)
      .then((d) => {
        setDetail(d);
        const init: Record<string, ItemDestination> = {};
        const checks: Record<string, boolean> = {};
        for (const item of d.items) {
          init[item.name] = item.destination || "Limbo";
          checks[item.name] = false;
        }
        setDests(init);
        setChecked(checks);
        const sentInit: Record<string, boolean> = {};
        for (const item of d.items) {
          if (item.dispatched) sentInit[item.name] = true;
        }
        setSent(sentInit);
      })
      .catch((e: unknown) => {
        console.warn("[DispatchView] error:", e);
        setError(e instanceof Error ? e.message : "Failed to load receipt.");
      })
      .finally(() => setLoading(false));
  }, [receiptName]);

  const handleSendOne = async (item: ReceiptItem) => {
    if (!detail) return;
    const dest = dests[item.name] || "Limbo";
    if (dest === "Truck" && !truckDests[item.name]) {
      showToast("Select which truck first.");
      return;
    }
    setSending((s) => ({ ...s, [item.name]: true }));
    try {
      const payload: DispatchItemInput[] = [{
        item_name: item.name,
        destination: dest,
        ...(dest === "Truck" && truckDests[item.name] ? { target_warehouse: truckDests[item.name] } : {}),
      }];
      await dispatchItems(detail.hcp_job || "", payload);
      setSent((s) => ({ ...s, [item.name]: true }));
      showToast("Item dispatched.");
    } catch (e: unknown) {
      console.warn("[DispatchView] handleSendOne error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSending((s) => ({ ...s, [item.name]: false }));
    }
  };

  const handleDispatchAll = async () => {
    if (!detail?.hcp_job) return;
    setDispatchingAll(true);
    try {
      const res = await dispatchAllToJob(detail.hcp_job);
      const newSent: Record<string, boolean> = { ...sent };
      for (const item of detail.items) newSent[item.name] = true;
      setSent(newSent);
      showToast(`Dispatched ${res.dispatched} item(s) to job.`);
    } catch (e: unknown) {
      console.warn("[DispatchView] handleDispatchAll error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setDispatchingAll(false);
    }
  };

  const handleSync = async () => {
    if (!detail) return;
    setSyncing(true);
    try {
      const checkedItems = detail.items.filter(
        (it) => checked[it.name] && (dests[it.name] || "Limbo") !== "Limbo" && !sent[it.name]
      );
      const payload: DispatchItemInput[] = checkedItems.map((it) => ({
        item_name: it.name,
        destination: dests[it.name],
        ...(dests[it.name] === "Truck" && truckDests[it.name] ? { target_warehouse: truckDests[it.name] } : {}),
      }));
      if (payload.length === 0) {
        showToast("No non-Limbo checked items to sync.");
        setSyncing(false);
        return;
      }
      const res = await dispatchItems(detail.hcp_job || "", payload);
      const newSent: Record<string, boolean> = { ...sent };
      for (const it of checkedItems) newSent[it.name] = true;
      setSent(newSent);
      showToast(`Synced ${res.dispatched} item(s).`);
    } catch (e: unknown) {
      console.warn("[DispatchView] handleSync error:", e);
      showToast(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSyncing(false);
    }
  };

  const toggleAll = () => {
    const next = !allChecked;
    setAllChecked(next);
    if (!detail) return;
    const newChecked: Record<string, boolean> = {};
    for (const item of detail.items) newChecked[item.name] = next;
    setChecked(newChecked);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-6 text-[#dc3545] text-sm">
        {error || "Failed to load receipt."}
        <button onClick={onBack} className="ml-4 text-[#c9a84c] underline text-sm">Back</button>
      </div>
    );
  }

  const hasJob = !!detail.hcp_job;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0d1120] border border-[#c9a84c]/50 text-[#c9a84c] text-sm px-5 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      {/* Back + header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-neutral-400 hover:text-[#c9a84c] transition flex items-center gap-1.5 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Receipts
          </button>
          <div className="h-4 w-px bg-[#1a1f32]" />
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider">{receiptName}</p>
            <h2 className="text-lg font-serif font-bold text-white">{detail.supplier}</h2>
          </div>
        </div>

        {/* Meta + receipt thumbnail */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
          <span className="font-bold text-[#c9a84c]">{fmt$$(detail.parsed_total)}</span>
          {detail.buyer_name && (
            <span className="flex items-center gap-1.5">
              <span className="h-6 w-6 rounded-full bg-[#1a1f32] text-[10px] font-bold text-[#c9a84c] flex items-center justify-center">
                {initials(detail.buyer_name)}
              </span>
              {detail.buyer_name}
            </span>
          )}
          <span>{fmtDate(detail.receipt_date)}</span>
          {detail.hcp_job_id && (
            <span className="text-[#c9a84c] font-mono text-xs">#{detail.hcp_job_id}</span>
          )}
          <ReceiptThumbnail
            receiptFile={detail.receipt_file}
            items={detail.items}
            supplier={detail.supplier}
            receiptName={receiptName}
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {hasJob && (
          <button
            onClick={handleDispatchAll}
            disabled={dispatchingAll}
            className="flex items-center gap-2 bg-gradient-to-br from-[#28a745] to-[#1e7e34] text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:from-[#34ce57] hover:to-[#28a745] transition disabled:opacity-50"
          >
            {dispatchingAll ? <Spinner size="sm" /> : null}
            DISPATCH ALL TO THIS JOB
          </button>
        )}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-[#1a1f32] text-neutral-300 font-semibold px-4 py-2.5 rounded-xl text-sm hover:text-white hover:bg-[#1e2540] transition disabled:opacity-50 border border-[#1a1f32]"
        >
          {syncing ? <Spinner size="sm" /> : null}
          SYNC CHECKED
        </button>

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-[#0d1120] border border-[#1a1f32] rounded-xl p-1">
          {(["table", "cards"] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                viewMode === m
                  ? "bg-[#c9a84c] text-[#080c18]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {m === "table" ? "Table" : "Cards"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3 mb-5 text-xs">
        {[
          { label: "Total", val: detail.dispatch_summary?.total ?? detail.items.length },
          { label: "Dispatched", val: detail.dispatch_summary?.dispatched ?? 0, color: "text-[#28a745]" },
          { label: "Pending", val: detail.dispatch_summary?.pending ?? 0, color: "text-[#E67E22]" },
          { label: "Limbo", val: detail.dispatch_summary?.limbo ?? 0, color: "text-[#E67E22]" },
        ].map((chip) => (
          <div key={chip.label} className="bg-[#0d1120] border border-[#1a1f32] rounded-lg px-3 py-1.5">
            <span className="text-neutral-500">{chip.label}: </span>
            <span className={`font-bold ${chip.color || "text-white"}`}>{chip.val}</span>
          </div>
        ))}
      </div>

      {/* Table view */}
      {viewMode === "table" && (
        <div className="bg-[#0d1120] border border-[#1a1f32] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1f32]">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-[#c9a84c]"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider min-w-[180px]">Item</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-16">Qty</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wider w-24">Price</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider w-20">Match</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wider">Destination</th>
                  <th className="px-3 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item) => (
                  <tr
                    key={item.name}
                    className={`border-b border-[#1a1f32] last:border-0 hover:bg-[#111627] transition ${
                      sent[item.name] ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={!!checked[item.name]}
                        onChange={(e) => setChecked((c) => ({ ...c, [item.name]: e.target.checked }))}
                        className="w-4 h-4 rounded accent-[#c9a84c]"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-white text-sm leading-tight">{item.matched_item_name || item.description}</p>
                      {item.product_code && (
                        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{item.product_code}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-white font-mono">{item.quantity}</td>
                    <td className="px-3 py-3 text-right text-[#c9a84c] font-mono">{fmt$$(item.unit_price)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-bold ${matchColor(item.match_score)}`}>
                        {item.match_score ? `${Math.round(item.match_score)}%` : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <DestButtons
                        current={dests[item.name] || "Limbo"}
                        hasJob={hasJob}
                        currentTruck={truckDests[item.name]}
                        onSelect={(d, truck) => {
                          setDests((prev) => ({ ...prev, [item.name]: d }));
                          if (truck) setTruckDests((prev) => ({ ...prev, [item.name]: truck }));
                        }}
                        disabled={!!sent[item.name]}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <SendButton
                        onClick={() => handleSendOne(item)}
                        loading={!!sending[item.name]}
                        done={!!sent[item.name]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card view */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {detail.items.map((item) => (
            <div
              key={item.name}
              className={`bg-[#0d1120] border border-[#1a1f32] rounded-2xl p-4 transition ${
                sent[item.name] ? "opacity-60" : "hover:border-[#c9a84c]/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white leading-tight">{item.matched_item_name || item.description}</p>
                  {item.product_code && (
                    <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{item.product_code}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[#c9a84c] font-bold font-mono">{fmt$$(item.unit_price)}</p>
                  <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                </div>
              </div>

              {item.match_score > 0 && (
                <p className={`text-xs mb-3 ${matchColor(item.match_score)}`}>
                  Match: {Math.round(item.match_score)}%
                </p>
              )}

              <div className="mb-3">
                <DestButtons
                  current={dests[item.name] || "Limbo"}
                  currentTruck={truckDests[item.name]}
                  hasJob={hasJob}
                  onSelect={(d, truck) => {
                    setDests((prev) => ({ ...prev, [item.name]: d }));
                    if (truck) setTruckDests((prev) => ({ ...prev, [item.name]: truck }));
                  }}
                  disabled={!!sent[item.name]}
                />
              </div>

              <SendButton
                onClick={() => handleSendOne(item)}
                loading={!!sending[item.name]}
                done={!!sent[item.name]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
