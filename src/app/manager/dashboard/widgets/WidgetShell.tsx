"use client";

import React from "react";

interface WidgetShellProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  onDrill?: () => void;
  className?: string;
}

export default function WidgetShell({
  title,
  children,
  loading,
  onDrill,
  className = "",
}: WidgetShellProps) {
  return (
    <div
      className={`bg-navy-surface border border-navy-border rounded-xl overflow-hidden ${className}`}
      onClick={onDrill}
      role={onDrill ? "button" : undefined}
      tabIndex={onDrill ? 0 : undefined}
      onKeyDown={onDrill ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onDrill(); } } : undefined}
      style={onDrill ? { cursor: "pointer" } : undefined}
    >
      <div className="px-4 py-3 border-b border-navy-border flex items-center justify-between">
        <h3 className="text-sm font-bold text-cream/70 tracking-wider uppercase">
          {title}
        </h3>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
