interface DrawdownGaugeProps {
  drawdownPct: number;
  tier: "safe" | "caution" | "warning" | "critical" | string;
}

const tierConfig = {
  safe: { color: "bg-emerald-400", label: "Safe" },
  caution: { color: "bg-amber-400", label: "Caution" },
  warning: { color: "bg-orange-500", label: "Warning" },
  critical: { color: "bg-red-500", label: "Critical" },
};

export default function DrawdownGauge({
  drawdownPct,
  tier,
}: DrawdownGaugeProps) {
  const config = tierConfig[tier as keyof typeof tierConfig] || tierConfig.safe;
  const widthPct = Math.min(Math.abs(drawdownPct) * 5, 100); // 20% DD = full bar

  return (
    <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          Drawdown
        </p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${config.color}/10 font-medium`}
        >
          {config.label}
        </span>
      </div>
      <p className="text-2xl font-mono font-bold text-red-400 mb-3">
        {drawdownPct.toFixed(2)}%
      </p>
      <div className="h-2 bg-navy-card rounded-full overflow-hidden">
        <div
          className={`h-full ${config.color} rounded-full transition-all duration-500`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-neutral-600">
        <span>0%</span>
        <span>-3%</span>
        <span>-5%</span>
        <span>-10%</span>
        <span>-20%</span>
      </div>
    </div>
  );
}
