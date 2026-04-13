interface StatusBadgeProps {
  mode: "live" | "paper" | string;
}

export default function StatusBadge({ mode }: StatusBadgeProps) {
  const isLive = mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
        isLive
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isLive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
        }`}
      />
      {mode}
    </span>
  );
}
