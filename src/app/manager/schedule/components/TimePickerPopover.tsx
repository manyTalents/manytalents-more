"use client";

import { useState } from "react";

interface TimePickerPopoverProps {
  onSelect: (startTime: string, endTime: string) => void;
  onCancel: () => void;
}

const QUICK_PICKS = [
  { label: "8\u201310", start: "08:00:00", end: "10:00:00" },
  { label: "10\u201312", start: "10:00:00", end: "12:00:00" },
  { label: "1\u20133", start: "13:00:00", end: "15:00:00" },
  { label: "3\u20135", start: "15:00:00", end: "17:00:00" },
];

export default function TimePickerPopover({ onSelect, onCancel }: TimePickerPopoverProps) {
  const [custom, setCustom] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-[#1a2332] border border-[#2a3a4e] rounded-xl p-4 min-w-[280px]" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-bold uppercase tracking-widest text-[#c9a84c] mb-3">Select Time Block</div>
        {!custom ? (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {QUICK_PICKS.map((pick) => (
                <button
                  key={pick.label}
                  onClick={() => onSelect(pick.start, pick.end)}
                  className="bg-[#0f1729] border border-[#2a3a4e] rounded-lg px-3 py-2 text-[#f5f0e8] text-sm font-semibold hover:border-[#c9a84c] transition-colors"
                >
                  {pick.label}
                </button>
              ))}
            </div>
            <button onClick={() => setCustom(true)} className="text-xs text-[#c9a84c] hover:text-[#e0c878] w-full text-center">
              Custom time...
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div>
                <label className="text-[10px] text-[#354a61] uppercase">Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="block w-full bg-[#0f1729] border border-[#2a3a4e] rounded-lg px-2 py-1.5 text-[#f5f0e8] text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-[#354a61] uppercase">End</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="block w-full bg-[#0f1729] border border-[#2a3a4e] rounded-lg px-2 py-1.5 text-[#f5f0e8] text-sm" />
              </div>
            </div>
            <button onClick={() => onSelect(startTime + ":00", endTime + ":00")}
              className="w-full bg-[#c9a84c] text-[#0f1729] font-semibold py-2 rounded-lg text-sm">
              Set Time
            </button>
          </div>
        )}
        <button onClick={onCancel} className="mt-2 text-xs text-[#f5f0e8]/40 hover:text-[#f5f0e8] w-full text-center">Cancel</button>
      </div>
    </div>
  );
}
