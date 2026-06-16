"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";
import { getAuth } from "@/lib/frappe";
import { getErrorMessage } from "@/lib/errors";
import { fetchScheduleBoard, ScheduleBoardData, getWeekStart, createTimeOff } from "@/lib/schedule";
import ScheduleGrid from "./components/ScheduleGrid";
import UnscheduledSidebar from "./components/UnscheduledSidebar";

export default function SchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScheduleBoardData | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showSat, setShowSat] = useState(false);
  const [showSun, setShowSun] = useState(false);
  const [projection, setProjection] = useState(false);
  const [showTimeOff, setShowTimeOff] = useState(false);
  const [toEmployee, setToEmployee] = useState("");
  const [toDate, setToDate] = useState("");
  const [toReason, setToReason] = useState("");
  const [toSaving, setToSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchScheduleBoard(weekStart);
      setData(result);
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (!getAuth()) { router.replace("/manager"); return; }
    loadData();
  }, [loadData, router]);

  useEffect(() => {
    const interval = setInterval(loadData, projection ? 30000 : 60000);
    return () => clearInterval(interval);
  }, [loadData, projection]);

  const navigateWeek = (dir: -1 | 1) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split("T")[0]);
    setLoading(true);
  };

  const goThisWeek = () => { setWeekStart(getWeekStart(new Date())); setLoading(true); };

  const weekEnd = new Date(weekStart + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 4);
  const weekLabel = `${new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} \u2014 ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  if (projection && data) {
    return (
      <div className="fixed inset-0 bg-[#0f1729] z-50 overflow-auto p-4">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-2xl text-[#f5f0e8]" style={{ fontFamily: "'Playfair Display', serif" }}>Schedule Board</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#f5f0e8]">{weekLabel}</span>
            <button onClick={() => setProjection(false)} className="text-sm text-[#f5f0e8]/60 hover:text-[#f5f0e8] border border-[#2a3a4e] px-3 py-1.5 rounded-lg">
              Exit Projection
            </button>
          </div>
        </div>
        <ScheduleGrid data={data} weekStart={weekStart} onRefresh={loadData} showSat={showSat} showSun={showSun} />
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="flex h-[calc(100vh-105px)]">
        {data && <UnscheduledSidebar jobs={data.unscheduled} onRefresh={loadData} />}
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl text-[#f5f0e8]" style={{ fontFamily: "'Playfair Display', serif" }}>Schedule Board</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTimeOff(true)} className="bg-[#1a2332] border border-[#2a3a4e] text-[#f5f0e8] px-3 py-1.5 rounded-lg text-xs hover:border-[#c9a84c]">+ Time Off</button>
              <button onClick={goThisWeek} className="border border-[#c9a84c] text-[#c9a84c] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#c9a84c]/10">This Week</button>
              <button onClick={() => navigateWeek(-1)} className="bg-[#1a2332] border border-[#2a3a4e] text-[#f5f0e8] w-8 h-8 rounded-lg flex items-center justify-center hover:border-[#c9a84c]">&larr;</button>
              <div className="text-sm font-semibold text-[#f5f0e8] min-w-[180px] text-center">{weekLabel}</div>
              <button onClick={() => navigateWeek(1)} className="bg-[#1a2332] border border-[#2a3a4e] text-[#f5f0e8] w-8 h-8 rounded-lg flex items-center justify-center hover:border-[#c9a84c]">&rarr;</button>
              <button onClick={() => setProjection(true)} className="border border-[#2a3a4e] text-[#f5f0e8] px-3 py-1.5 rounded-lg text-xs opacity-70 hover:opacity-100 hover:border-[#c9a84c]">Projection</button>
              <div className="flex items-center gap-2 ml-3">
                <label className="flex items-center gap-1 text-[11px] text-[#354a61]">
                  <input type="checkbox" checked={showSat} onChange={(e) => setShowSat(e.target.checked)} className="accent-[#c9a84c] w-3 h-3" /> Sat
                </label>
                <label className="flex items-center gap-1 text-[11px] text-[#354a61]">
                  <input type="checkbox" checked={showSun} onChange={(e) => setShowSun(e.target.checked)} className="accent-[#c9a84c] w-3 h-3" /> Sun
                </label>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <ScheduleGrid data={data} weekStart={weekStart} onRefresh={loadData} showSat={showSat} showSun={showSun} />
          ) : (
            <div className="text-center text-[#f5f0e8]/60 mt-20">Failed to load schedule data.</div>
          )}
        </div>
      </div>
      {/* Time Off Modal */}
      {showTimeOff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTimeOff(false)}>
          <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#c9a84c] mb-4">Request Time Off</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#354a61] mb-1">Employee</label>
                <select value={toEmployee} onChange={(e) => setToEmployee(e.target.value)}
                  className="w-full bg-[#0f1729] border border-[#2a3a4e] rounded-lg px-3 py-2 text-[#f5f0e8] text-sm">
                  <option value="">Select...</option>
                  {data?.techs.map((t) => <option key={t.user_id} value={t.user_id}>{t.employee_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#354a61] mb-1">Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-[#0f1729] border border-[#2a3a4e] rounded-lg px-3 py-2 text-[#f5f0e8] text-sm" />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[#354a61] mb-1">Reason</label>
                <input value={toReason} onChange={(e) => setToReason(e.target.value)} placeholder="Optional"
                  className="w-full bg-[#0f1729] border border-[#2a3a4e] rounded-lg px-3 py-2 text-[#f5f0e8] text-sm" />
              </div>
              <button disabled={toSaving || !toEmployee || !toDate} onClick={async () => {
                setToSaving(true);
                try {
                  await createTimeOff({ employee: toEmployee, date: toDate, reason: toReason });
                  setShowTimeOff(false); setToEmployee(""); setToDate(""); setToReason("");
                  loadData();
                } catch (err: unknown) { alert(getErrorMessage(err) || "Failed"); }
                setToSaving(false);
              }} className="w-full bg-[#c9a84c] text-[#0f1729] font-bold py-2.5 rounded-lg disabled:opacity-50">
                {toSaving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
