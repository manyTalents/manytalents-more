"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, callMethod } from "@/lib/frappe";
import {
  getFeatureFlags,
  fetchFeatureFlags,
  clearFeatureFlags,
  type FeatureFlags,
} from "@/lib/features";
import NavBar from "@/app/manager/components/NavBar";

const FLAG_LABELS: { key: keyof FeatureFlags; label: string; description: string }[] = [
  { key: "invoicing", label: "Invoicing", description: "Invoices page and AR aging dashboard widget" },
  { key: "estimates", label: "Estimates", description: "Estimates list, detail, and new estimate pages" },
  { key: "service_plans", label: "Service Plans", description: "Service plans list, detail, and templates pages" },
  { key: "customers", label: "Customers", description: "Customer list and profile pages" },
  { key: "inventory", label: "Inventory", description: "Inventory management page" },
  { key: "pricebook", label: "Pricebook", description: "Pricing / pricebook management page" },
  { key: "team", label: "Team", description: "Team / technician onboarding and management page" },
  { key: "events", label: "Events", description: "Events page and event badge in the nav bar" },
  { key: "scheduling", label: "Scheduling", description: "Schedule board — assign techs to jobs by day" },
];

export default function FeatureFlagsPage() {
  const router = useRouter();
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags());
  const [saving, setSaving] = useState<keyof FeatureFlags | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    fetchFeatureFlags().then(setFlags).catch(() => {});
  }, [router]);

  const handleToggle = async (key: keyof FeatureFlags) => {
    const newValue = !flags[key];
    setSaving(key);
    setError("");
    setSuccess("");
    try {
      await callMethod("frappe.client.set_value", {
        doctype: "MTM Feature Flags",
        name: "MTM Feature Flags",
        fieldname: key,
        value: newValue ? 1 : 0,
      });
      const updated = { ...flags, [key]: newValue };
      setFlags(updated);
      clearFeatureFlags();
      // Re-prime cache with the new values
      localStorage.setItem(
        "mtm_feature_flags",
        JSON.stringify({ flags: updated, ts: Date.now() })
      );
      setSuccess(`${FLAG_LABELS.find((f) => f.key === key)?.label} ${newValue ? "enabled" : "disabled"}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save flag");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-gold mb-2">Admin</p>
          <h1 className="text-2xl font-serif font-extrabold text-cream">Feature Flags</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Toggle features on or off across the manager dashboard. Changes take effect immediately.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-4 py-3 text-sm text-emerald-300 mb-6">
            {success}
          </div>
        )}

        <div className="bg-navy-surface border border-navy-border rounded-2xl divide-y divide-navy-border overflow-hidden">
          {FLAG_LABELS.map(({ key, label, description }) => {
            const enabled = flags[key];
            const isSaving = saving === key;

            return (
              <div
                key={key}
                className="flex items-center justify-between px-6 py-4 gap-4 hover:bg-white/[0.02] transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-cream">{label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`Toggle ${label}`}
                  disabled={isSaving}
                  onClick={() => handleToggle(key)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy disabled:opacity-50 disabled:cursor-not-allowed ${
                    enabled
                      ? "bg-gold border-gold-dark"
                      : "bg-navy border-navy-border"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform mt-0.5 ${
                      enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                  {isSaving && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-3 h-3 border border-navy/40 border-t-navy rounded-full animate-spin" />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-neutral-600 mt-4 text-center">
          Flags are cached for 5 minutes in each browser session.
        </p>
      </main>
    </div>
  );
}
