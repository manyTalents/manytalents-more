"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, getEstimateList, type EstimateSummary } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

const STATUS_FILTERS = ["all", "Draft", "Sent", "Approved", "Declined", "Expired"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_BADGE: Record<string, string> = {
  Draft: "bg-neutral-700/60 text-neutral-300",
  Sent: "bg-blue-900/60 text-blue-300",
  Approved: "bg-emerald-900/60 text-emerald-300",
  Declined: "bg-red-900/60 text-red-300",
  Expired: "bg-amber-900/60 text-amber-300",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-neutral-700/60 text-neutral-300";
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
}

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function EstimatesPage() {
  const router = useRouter();

  const [estimates, setEstimates] = useState<EstimateSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // Auth guard
  useEffect(() => {
    if (!getAuth()) { router.replace("/manager"); return; }
  }, [router]);

  const fetchEstimates = useCallback(async (filter: StatusFilter, pg: number, append: boolean) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const res = await getEstimateList(filter, pg, 30);
      if (append) {
        setEstimates((prev) => [...prev, ...res.estimates]);
      } else {
        setEstimates(res.estimates);
      }
      setTotalCount(res.total_count);
      setHasMore(res.has_more);
    } catch (err: any) {
      setError(err.message || "Failed to load estimates");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchEstimates(statusFilter, 1, false);
  }, [statusFilter, fetchEstimates]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchEstimates(statusFilter, next, true);
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-cream">Estimates</h1>
            {!loading && (
              <p className="text-xs text-neutral-500 mt-0.5">
                {totalCount.toLocaleString()} total
              </p>
            )}
          </div>
          <Link
            href="/manager/estimates/new"
            className="inline-flex items-center gap-2 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-4 py-2 rounded-lg text-sm hover:from-gold-light hover:to-gold transition"
          >
            + New Estimate
          </Link>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              disabled={loading}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                statusFilter === f
                  ? "bg-gold-dark/30 text-gold border border-gold-dark/60"
                  : "bg-navy-surface border border-navy-border text-neutral-400 hover:text-cream hover:border-neutral-600"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-navy-surface rounded-xl border border-navy-border overflow-hidden">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-border">
                      <th className="text-left px-5 py-3 text-xs font-bold text-cream/50 tracking-wider">ESTIMATE #</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">CUSTOMER</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">LINKED JOB</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">TOTAL</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">STATUS</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-cream/50 tracking-wider">CREATED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimates.map((e) => (
                      <tr
                        key={e.name}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/manager/estimates/${encodeURIComponent(e.name)}`)}
                        onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") router.push(`/manager/estimates/${encodeURIComponent(e.name)}`); }}
                        className="border-b border-navy-border/50 hover:bg-navy-card/50 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-gold"
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-mono text-gold">
                            {e.estimate_number || e.name}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-cream">{e.customer_name}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {e.linked_job ? (
                            <span className="text-xs font-mono text-neutral-400">{e.linked_job}</span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-medium text-cream">{fmtCurrency(e.total)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <StatusBadge status={e.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-neutral-500">
                          {fmtDate(e.created)}
                        </td>
                      </tr>
                    ))}
                    {estimates.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                          No estimates found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden divide-y divide-navy-border/50">
                {estimates.map((e) => (
                  <Link
                    key={e.name}
                    href={`/manager/estimates/${encodeURIComponent(e.name)}`}
                    className="flex items-start justify-between px-4 py-4 hover:bg-navy-card/50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-gold">{e.estimate_number || e.name}</p>
                      <p className="text-sm font-medium text-cream truncate mt-0.5">{e.customer_name}</p>
                      {e.linked_job && (
                        <p className="text-xs text-neutral-500 mt-0.5">{e.linked_job}</p>
                      )}
                      <div className="mt-1.5">
                        <StatusBadge status={e.status} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-medium text-cream">{fmtCurrency(e.total)}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{fmtDate(e.created)}</p>
                    </div>
                  </Link>
                ))}
                {estimates.length === 0 && (
                  <p className="px-4 py-12 text-center text-neutral-500">No estimates found</p>
                )}
              </div>
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-navy-surface border border-navy-border text-cream/70 hover:text-cream hover:border-gold-dark px-6 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
