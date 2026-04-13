interface Trade {
  id: number;
  ticker?: string;
  pair?: string;
  side?: string;
  strategy: string;
  pnl: number;
  date: string;
}

interface TradeTableProps {
  trades: Trade[];
  loading?: boolean;
}

export default function TradeTable({ trades, loading }: TradeTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-navy-card rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <p className="text-neutral-500 text-sm py-4 text-center">
        No trades to display.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-navy-border text-neutral-500 text-xs uppercase tracking-wider">
            <th className="text-left py-3 px-2">Asset</th>
            <th className="text-left py-3 px-2">Strategy</th>
            <th className="text-right py-3 px-2">P&L</th>
            <th className="text-right py-3 px-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr
              key={t.id}
              className="border-b border-navy-border/50 hover:bg-navy-card/50 transition"
            >
              <td className="py-3 px-2 font-medium">
                {t.ticker || t.pair}
                {t.side && (
                  <span className="ml-1.5 text-xs text-neutral-500">
                    {t.side}
                  </span>
                )}
              </td>
              <td className="py-3 px-2 text-neutral-400">{t.strategy}</td>
              <td
                className={`py-3 px-2 text-right font-mono ${
                  t.pnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
              </td>
              <td className="py-3 px-2 text-right text-neutral-500">
                {t.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
