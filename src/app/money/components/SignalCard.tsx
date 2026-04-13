interface SignalCardProps {
  label: string;
  value: string | number;
  status?: string;
  detail?: string;
  color?: "gold" | "emerald" | "red" | "amber" | "blue";
}

const colorMap = {
  gold: "border-gold/20 bg-gold/5",
  emerald: "border-emerald-500/20 bg-emerald-500/5",
  red: "border-red-500/20 bg-red-500/5",
  amber: "border-amber-500/20 bg-amber-500/5",
  blue: "border-blue-500/20 bg-blue-500/5",
};

export default function SignalCard({
  label,
  value,
  status,
  detail,
  color = "gold",
}: SignalCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${colorMap[color]}`}
    >
      <p className="text-xs uppercase tracking-wider text-neutral-500 mb-1">
        {label}
      </p>
      <p className="text-2xl font-serif font-bold">{value}</p>
      {status && (
        <p className="text-sm text-neutral-300 mt-1">{status}</p>
      )}
      {detail && (
        <p className="text-xs text-neutral-500 mt-1">{detail}</p>
      )}
    </div>
  );
}
