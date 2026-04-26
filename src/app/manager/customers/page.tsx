"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAuth, getCustomerList, type CustomerListItem } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

const fmtCurrency = (n: number) =>
  `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function CustomersPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth guard
  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
  }, [router]);

  const fetchCustomers = useCallback(async (query: string, pg: number, append: boolean) => {
    if (pg === 1) setLoading(true);
    else setLoadingMore(true);
    setError("");
    try {
      const res = await getCustomerList(query, pg, 30);
      if (append) {
        setCustomers((prev) => [...prev, ...res.customers]);
      } else {
        setCustomers(res.customers);
      }
      setTotalCount(res.total_count);
      setHasMore(res.has_more);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCustomers("", 1, false);
  }, [fetchCustomers]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchCustomers(value, 1, false);
    }, 300);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCustomers(search, nextPage, true);
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-cream">Customers</h1>
            {!loading && (
              <p className="text-xs text-neutral-500 mt-0.5">
                {totalCount.toLocaleString()} total
              </p>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full max-w-xl bg-navy-surface border border-navy-border rounded-lg px-5 py-3 text-cream placeholder-neutral-600 focus:outline-none focus:border-gold-dark transition"
          />
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
                      <th className="text-left px-5 py-3 text-xs font-bold text-cream/50 tracking-wider">CUSTOMER</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">PHONE</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">ADDRESSES</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">TOTAL OWED</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-cream/50 tracking-wider">LIFETIME VALUE</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-cream/50 tracking-wider">LAST JOB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr
                        key={c.name}
                        onClick={() => router.push(`/manager/customers/${encodeURIComponent(c.name)}`)}
                        className="border-b border-navy-border/50 hover:bg-navy-card/50 transition cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-cream">{c.customer_name}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{c.job_count} job{c.job_count !== 1 ? "s" : ""}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-neutral-400">
                          {c.phone || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm text-neutral-400">{c.address_count}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`text-sm font-medium ${c.total_owed > 0 ? "text-red-400" : "text-neutral-500"}`}>
                            {c.total_owed > 0 ? fmtCurrency(c.total_owed) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-medium text-gold">
                            {fmtCurrency(c.lifetime_value)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-sm text-neutral-500">
                          {fmtDate(c.last_job_date)}
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center text-neutral-500">
                          {error ? "Search failed. Try again." : "No customers found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden divide-y divide-navy-border/50">
                {customers.map((c) => (
                  <Link
                    key={c.name}
                    href={`/manager/customers/${encodeURIComponent(c.name)}`}
                    className="flex items-start justify-between px-4 py-4 hover:bg-navy-card/50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cream truncate">{c.customer_name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {c.phone || "No phone"} · {c.job_count} job{c.job_count !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-neutral-600 mt-0.5">{fmtDate(c.last_job_date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-medium text-gold">{fmtCurrency(c.lifetime_value)}</p>
                      {c.total_owed > 0 && (
                        <p className="text-xs text-red-400 mt-0.5">owes {fmtCurrency(c.total_owed)}</p>
                      )}
                    </div>
                  </Link>
                ))}
                {customers.length === 0 && (
                  <p className="px-4 py-12 text-center text-neutral-500">
                    {error ? "Search failed. Try again." : "No customers found"}
                  </p>
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
