interface StrategyCardProps {
  name: string;
  status: "active" | "watching" | "inactive" | string;
  allocation: number;
  trades: number;
  winRate: number;
  pnl: number;
}

const statusColors = {
  active: "text-emerald-400",
  watching: "text-amber-400",
  inactive: "text-neutral-500",
};

export default function StrategyCard({
  name,
  status,
  allocation,
  trades,
  winRate,
  pnl,
}: StrategyCardProps) {
  return (
    <div className="bg-navy-surface border border-navy-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">{name}</h4>
        <span
          className={`text-xs uppercase tracking-wider ${
            statusColors[status as keyof typeof statusColors] ||
            statusColors.inactive
          }`}
        >
          {status}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-neutral-500 text-xs">Allocation</p>
          <p className="font-mono">{allocation}%</p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs">Trades</p>
          <p className="font-mono">{trades}</p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs">Win Rate</p>
          <p className="font-mono">{winRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs">P&L</p>
          <p
            className={`font-mono ${
              pnl >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
