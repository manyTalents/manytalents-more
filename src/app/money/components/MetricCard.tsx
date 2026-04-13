interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
}

export default function MetricCard({
  label,
  value,
  subValue,
  trend,
  loading,
}: MetricCardProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-neutral-400";

  return (
    <div className="bg-navy-surface border border-navy-border rounded-2xl p-5">
      <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
        {label}
      </p>
      {loading ? (
        <div className="h-10 w-24 bg-navy-card rounded animate-pulse" />
      ) : (
        <>
          <p className="text-3xl font-serif font-extrabold text-gold-gradient">
            {value}
          </p>
          {subValue && (
            <p className={`text-sm mt-1 ${trendColor}`}>{subValue}</p>
          )}
        </>
      )}
    </div>
  );
}
