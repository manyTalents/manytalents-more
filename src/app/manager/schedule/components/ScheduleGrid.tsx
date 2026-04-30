"use client";

import { useState, useCallback, Fragment } from "react";
import { ScheduleBoardData, SchedulePuck, updateJobSchedule } from "@/lib/schedule";
import Puck from "./Puck";
import TimeOffPuck from "./TimeOffPuck";
import TimePickerPopover from "./TimePickerPopover";
import { useRouter } from "next/navigation";

interface ScheduleGridProps {
  data: ScheduleBoardData;
  weekStart: string;
  onRefresh: () => void;
  showSat: boolean;
  showSun: boolean;
}

function getDaysOfWeek(weekStart: string, showSat: boolean, showSun: boolean) {
  const days: { date: string; label: string; dayName: string }[] = [];
  const start = new Date(weekStart + "T00:00:00");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dow = d.getDay();
    if (dow === 6 && !showSat) continue;
    if (dow === 0 && !showSun) continue;
    if (dow === 0 && i === 0) continue; // weekStart is Monday
    days.push({
      date: d.toISOString().split("T")[0],
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: dayNames[dow],
    });
  }
  return days;
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

export default function ScheduleGrid({ data, weekStart, onRefresh, showSat, showSun }: ScheduleGridProps) {
  const router = useRouter();
  const days = getDaysOfWeek(weekStart, showSat, showSun);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ jobName: string; techUser: string; date: string } | null>(null);

  const getJobsForCell = useCallback(
    (techUser: string, date: string) =>
      data.jobs.filter((j) => {
        const jobDate = (j.scheduled_date || "").split(" ")[0];
        return jobDate === date && j.assigned_techs.some((t) => t.tech_user === techUser);
      }),
    [data.jobs]
  );

  const getTimeOffForCell = useCallback(
    (employeeName: string, date: string) =>
      data.time_off.filter((t) => t.employee_name === employeeName && t.date === date),
    [data.time_off]
  );

  const handleDragStart = (e: React.DragEvent, job: SchedulePuck) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ jobName: job.name }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(cellId);
  };

  const handleDragLeave = () => setDragOverCell(null);

  const handleDrop = (e: React.DragEvent, techUser: string, date: string) => {
    e.preventDefault();
    setDragOverCell(null);
    try {
      const { jobName } = JSON.parse(e.dataTransfer.getData("application/json"));
      setPendingDrop({ jobName, techUser, date });
    } catch { /* ignore */ }
  };

  const handleTimeSelected = async (startTime: string, endTime: string) => {
    if (!pendingDrop) return;
    try {
      await updateJobSchedule({
        job_name: pendingDrop.jobName,
        scheduled_date: pendingDrop.date,
        start_time: startTime,
        end_time: endTime,
        tech_user: pendingDrop.techUser,
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to update schedule:", err);
    }
    setPendingDrop(null);
  };

  return (
    <>
      <div className="grid border border-[#2a3a4e] rounded-xl overflow-hidden bg-[#1a2332]"
        style={{ gridTemplateColumns: `140px repeat(${days.length}, 1fr)` }}>
        {/* Header */}
        <div className="bg-[#0f1729] p-2.5 border-b-2 border-[#a88a3a] border-r border-[#2a3a4e] flex items-center justify-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#c9a84c]">Trucks</span>
        </div>
        {days.map((day) => (
          <div key={day.date}
            className={`bg-[#0f1729] p-2.5 text-center border-b-2 border-[#a88a3a] border-r border-[#2a3a4e] last:border-r-0 ${isToday(day.date) ? "bg-[#c9a84c]/10" : ""}`}>
            <div className={`text-[11px] font-bold uppercase tracking-wide ${isToday(day.date) ? "text-[#e0c878]" : "text-[#c9a84c]"}`}>{day.dayName}</div>
            <div className="text-[13px] font-semibold text-[#f5f0e8] mt-0.5">{day.label}</div>
          </div>
        ))}

        {/* Tech rows */}
        {data.techs.map((tech) => (
          <Fragment key={tech.user_id}>
            <div className="bg-[#0f1729] px-3 py-3 border-b border-[#2a3a4e] border-r border-[#2a3a4e] flex flex-col justify-start">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#354a61]">Truck #{tech.truck_number}</span>
              <span className="text-[15px] font-bold text-[#f5f0e8]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {tech.employee_name.split(" ")[0]}
              </span>
            </div>
            {days.map((day) => {
              const cellId = `${tech.user_id}-${day.date}`;
              const cellJobs = getJobsForCell(tech.user_id, day.date);
              const cellTimeOff = getTimeOffForCell(tech.employee_name, day.date);
              return (
                <div key={cellId}
                  className={`border-b border-[#2a3a4e] border-r border-[#2a3a4e] last:border-r-0 p-1.5 min-h-[160px] max-h-[160px] overflow-y-auto transition-colors relative ${
                    isToday(day.date) ? "bg-[#c9a84c]/[0.04]" : "bg-[#1a2332]"
                  } ${dragOverCell === cellId ? "bg-[#c9a84c]/[0.08] outline-2 outline-dashed outline-[#c9a84c] -outline-offset-2" : ""}`}
                  style={{ scrollbarWidth: "thin" }}
                  onDragOver={(e) => handleDragOver(e, cellId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, tech.user_id, day.date)}>
                  {cellTimeOff.map((t) => <TimeOffPuck key={t.name} entry={t} onRefresh={onRefresh} />)}
                  {cellJobs.map((job) => (
                    <Puck key={job.name} job={job}
                      onClick={() => router.push(`/manager/jobs/${job.name}`)}
                      onDragStart={(e) => handleDragStart(e, job)} />
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      {pendingDrop && <TimePickerPopover onSelect={handleTimeSelected} onCancel={() => setPendingDrop(null)} />}
    </>
  );
}
