"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, checkOfficeAccess } from "@/lib/frappe";
import { getFeatureFlags } from "@/lib/features";
import NavBar from "@/app/manager/components/NavBar";
import { fetchPullSummary, fetchUnmatchedItems, type PullSummary } from "@/lib/inventory-api";
import { ReceiptsTab } from "./components/ReceiptsTab";
import { WarehousesTab } from "./components/WarehousesTab";
import { LimboTab } from "./components/LimboTab";
import { RestockTab } from "./components/RestockTab";
import { MatchesTab } from "./components/MatchesTab";
import { MappingsTab } from "./components/MappingsTab";
import type { MainTab } from "./components/utils";

// ── InventoryPage ─────────────────────────────

export default function InventoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MainTab>("receipts");
  const [summary, setSummary] = useState({ pending_receipts: 0, pending_limbo_items: 0, restock_items: 0 });
  const [restockBadge, setRestockBadge] = useState(0);
  const [matchesBadge, setMatchesBadge] = useState(0);
  const [isOffice, setIsOffice] = useState(false);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    if (!getFeatureFlags().inventory) {
      router.replace("/manager/dashboard");
      return;
    }
    // Fetch summary badge counts
    import("@/lib/inventory-api").then(({ fetchInventorySummary }) => {
      fetchInventorySummary()
        .then(setSummary)
        .catch(() => { /* non-critical */ });
    });
    fetchPullSummary()
      .then((s: PullSummary) => setRestockBadge(s.pending + s.rejected))
      .catch(() => { /* non-critical */ });
    fetchUnmatchedItems(1, 1)
      .then((r) => setMatchesBadge(r.total_count))
      .catch(() => { /* non-critical */ });
    // Check office access for Mappings tab visibility
    checkOfficeAccess()
      .then((res) => setIsOffice(res.is_office))
      .catch(() => { /* non-critical — tab stays hidden */ });
  }, [router]);

  const TABS: { key: MainTab; label: string; badge?: number }[] = [
    { key: "receipts", label: "RECEIPTS", badge: summary.pending_receipts || undefined },
    { key: "warehouses", label: "WAREHOUSES" },
    { key: "limbo", label: "LIMBO", badge: summary.pending_limbo_items || undefined },
    { key: "restock", label: "RESTOCK", badge: restockBadge || undefined },
    { key: "matches", label: "MATCHES", badge: matchesBadge || undefined },
    ...(isOffice ? [{ key: "mappings" as MainTab, label: "MAPPINGS" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#080c18]">
      <NavBar />

      {/* Sub-tab bar */}
      <div className="bg-[#0d1120] border-b border-[#1a1f32] sticky top-[49px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3 text-xs font-bold tracking-widest uppercase transition border-b-2 ${
                  activeTab === tab.key
                    ? "border-[#c9a84c] text-[#c9a84c]"
                    : "border-transparent text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 bg-[#E67E22] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "receipts" && <ReceiptsTab />}
        {activeTab === "warehouses" && <WarehousesTab />}
        {activeTab === "limbo" && <LimboTab />}
        {activeTab === "restock" && <RestockTab />}
        {activeTab === "matches" && (
          <MatchesTab onCountChange={(n) => setMatchesBadge(n)} />
        )}
        {activeTab === "mappings" && isOffice && <MappingsTab />}
      </main>
    </div>
  );
}
