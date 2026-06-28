"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  callMethod,
  getInvoiceSettings,
  updateInvoiceSettings,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";
import { getErrorMessage } from "@/lib/errors";

// ── Old doctype fields ──────────────────────────────────────────────────────

interface OldInvoiceSettings {
  default_markup_pct: number;
  default_labor_rate: number;
  card_processing_pct: number;
  crypto_processing_pct: number;
  cash_discount_label: string;
  payment_terms_text: string;
  clause_1_title: string;
  clause_1_text: string;
  clause_2_title: string;
  clause_2_text: string;
  clause_3_title: string;
  clause_3_text: string;
  google_review_url: string;
  company_license_number: string;
}

const FIELDS = [
  "default_markup_pct", "default_labor_rate", "card_processing_pct", "crypto_processing_pct",
  "cash_discount_label", "payment_terms_text",
  "clause_1_title", "clause_1_text", "clause_2_title", "clause_2_text",
  "clause_3_title", "clause_3_text", "google_review_url", "company_license_number",
];

// ── Component ───────────────────────────────────────────────────────────────

export default function InvoiceSettingsPage() {
  const router = useRouter();

  // -- Old doctype state --
  const [settings, setSettings] = useState<OldInvoiceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // -- New Forge content state --
  const [clauses, setClauses] = useState<string[]>([]);
  const [verse, setVerse] = useState("");
  const [licenseText, setLicenseText] = useState("");
  const [contentLoading, setContentLoading] = useState(true);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentSuccess, setContentSuccess] = useState("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  const loadSettings = async () => {
    try {
      const res = await callMethod("frappe.client.get", {
        doctype: "MTM Invoice Settings",
        name: "MTM Invoice Settings",
      });
      setSettings(res as OldInvoiceSettings);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Failed to load settings");
    }
  };

  const loadContent = async () => {
    setContentLoading(true);
    setContentError("");
    try {
      const res = await getInvoiceSettings();
      setClauses(res.clauses.map((c) => c.clause_text));
      setVerse(res.scripture_verse);
      setLicenseText(res.license_line);
    } catch (e: unknown) {
      setContentError(getErrorMessage(e) || "Failed to load invoice content");
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    if (!getAuth()) { router.replace("/manager"); return; }
    loadSettings();
    loadContent();
  }, [router]);

  // ── Old doctype save ──────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      for (const field of FIELDS) {
        await callMethod("frappe.client.set_value", {
          doctype: "MTM Invoice Settings",
          name: "MTM Invoice Settings",
          fieldname: field,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic docfield access
          value: (settings as any)[field] ?? "",
        });
      }
      setSuccess("Settings saved");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || "Save failed");
    }
    setSaving(false);
  };

  const update = (field: string, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  // ── Forge content save ────────────────────────────────────────────────────

  const handleSaveContent = async () => {
    setContentSaving(true);
    setContentError("");
    setContentSuccess("");
    setPermissionDenied(false);
    try {
      await updateInvoiceSettings(clauses, verse, licenseText);
      setContentSuccess("Invoice content saved");
      setTimeout(() => setContentSuccess(""), 3000);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      if (msg.includes("(403)") || msg.toLowerCase().includes("permissionerror")) {
        setPermissionDenied(true);
      } else {
        setContentError(msg || "Save failed");
      }
    } finally {
      setContentSaving(false);
    }
  };

  // ── Clause list helpers ───────────────────────────────────────────────────

  const updateClause = (i: number, text: string) => {
    const next = [...clauses];
    next[i] = text;
    setClauses(next);
  };

  const moveClause = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= clauses.length) return;
    const next = [...clauses];
    [next[i], next[j]] = [next[j], next[i]];
    setClauses(next);
  };

  const removeClause = (i: number) => {
    setClauses(clauses.filter((_, idx) => idx !== i));
  };

  const addClause = () => {
    setClauses([...clauses, ""]);
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (!settings) {
    return (
      <>
        <NavBar />
        <div className="min-h-screen bg-navy p-6">
          <p className="text-cream">{error || "Loading..."}</p>
        </div>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-navy p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">

          {/* ── Breadcrumb ── */}
          <p className="text-xs uppercase tracking-widest text-gold mb-2">Admin</p>
          <h1 className="text-2xl font-serif font-extrabold text-cream mb-1">Invoice Settings</h1>
          <p className="text-neutral-400 text-sm mb-6">
            Pricing defaults and payment configuration for AllTec invoices.
          </p>

          {/* ── Old doctype feedback ── */}
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

          {/* Pricing */}
          <Section title="Pricing">
            <Row label="Material Markup %" value={settings.default_markup_pct} onChange={(v) => update("default_markup_pct", parseFloat(v) || 0)} type="number" />
            <Row label="Labor Rate ($/hr)" value={settings.default_labor_rate} onChange={(v) => update("default_labor_rate", parseFloat(v) || 0)} type="number" />
            <Row label="Card Processing %" value={settings.card_processing_pct} onChange={(v) => update("card_processing_pct", parseFloat(v) || 0)} type="number" />
            <Row label="Crypto Processing %" value={settings.crypto_processing_pct} onChange={(v) => update("crypto_processing_pct", parseFloat(v) || 0)} type="number" />
            <Row label="Cash Discount Label" value={settings.cash_discount_label} onChange={(v) => update("cash_discount_label", v)} />
          </Section>

          {/* Payment Terms */}
          <Section title="Payment Terms">
            <TextArea label="Terms Text" value={settings.payment_terms_text} onChange={(v) => update("payment_terms_text", v)} />
          </Section>

          {/* Static Clauses (legacy) */}
          <Section title="Legacy Invoice Clauses">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-4 pl-3 border-l-2 border-gold-dark/30">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic docfield access */}
                <Row label={`Clause ${i} Title`} value={(settings as any)[`clause_${i}_title`]} onChange={(v) => update(`clause_${i}_title`, v)} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic docfield access */}
                <TextArea label={`Clause ${i} Text`} value={(settings as any)[`clause_${i}_text`]} onChange={(v) => update(`clause_${i}_text`, v)} />
              </div>
            ))}
          </Section>

          {/* Branding */}
          <Section title="Branding">
            <Row label="Google Review URL" value={settings.google_review_url} onChange={(v) => update("google_review_url", v)} />
            <Row label="License Number" value={settings.company_license_number} onChange={(v) => update("company_license_number", v)} />
          </Section>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-xl disabled:opacity-50 mt-2 mb-12"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>

          {/* ── Divider ─────────────────────────────────────────────────── */}
          <div className="border-t border-navy-border mb-8" />

          {/* ── Invoice Content (Forge API) ──────────────────────────────── */}
          <p className="text-xs uppercase tracking-widest text-gold mb-2">Invoice Content</p>
          <h2 className="text-xl font-serif font-bold text-cream mb-1">Body Clauses &amp; Footer</h2>
          <p className="text-neutral-400 text-sm mb-6">
            Dynamic clause list, scripture verse, and license line printed on every AllTec invoice.
            Office role required to save (System Manager, Accounts Manager, or MTM Office).
          </p>

          {/* Content feedback */}
          {permissionDenied && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg px-4 py-3 text-sm text-amber-300 mb-6">
              You don&apos;t have permission to edit invoice content. An office role is required
              (System Manager, Accounts Manager, or MTM Office).
            </div>
          )}
          {contentError && (
            <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-6">
              {contentError}
            </div>
          )}
          {contentSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-4 py-3 text-sm text-emerald-300 mb-6">
              {contentSuccess}
            </div>
          )}

          {contentLoading ? (
            <div className="bg-navy-surface border border-navy-border rounded-xl p-6 text-center">
              <p className="text-neutral-500 text-sm">Loading invoice content…</p>
            </div>
          ) : (
            <>
              {/* ── Clauses ── */}
              <Section title="Body Clauses">
                {clauses.length === 0 && (
                  <p className="text-neutral-500 text-sm mb-3">No clauses yet. Add one below.</p>
                )}
                {clauses.map((text, i) => (
                  <div
                    key={i}
                    className="mb-4 bg-navy border border-navy-border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500 flex-1">
                        Clause {i + 1}
                      </span>
                      {/* Reorder */}
                      <button
                        type="button"
                        aria-label="Move clause up"
                        onClick={() => moveClause(i, -1)}
                        disabled={i === 0}
                        className="px-2 py-0.5 text-xs text-neutral-400 hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Move clause down"
                        onClick={() => moveClause(i, 1)}
                        disabled={i === clauses.length - 1}
                        className="px-2 py-0.5 text-xs text-neutral-400 hover:text-cream disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        ▼
                      </button>
                      {/* Remove */}
                      <button
                        type="button"
                        aria-label="Remove clause"
                        onClick={() => removeClause(i)}
                        className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => updateClause(i, e.target.value)}
                      rows={3}
                      placeholder="Enter clause text…"
                      className="w-full bg-navy-surface border border-navy-border rounded-lg px-3 py-2 text-cream text-sm focus:border-gold-dark focus:outline-none resize-none"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addClause}
                  className="w-full border border-dashed border-navy-border rounded-lg py-2.5 text-sm text-neutral-400 hover:text-cream hover:border-gold-dark/50 transition"
                >
                  + Add Clause
                </button>
              </Section>

              {/* ── Scripture Verse ── */}
              <Section title="Scripture Verse">
                <TextArea
                  label="Verse text (printed at bottom of invoice)"
                  value={verse}
                  onChange={setVerse}
                />
              </Section>

              {/* ── License Line ── */}
              <Section title="License Line">
                <Row
                  label="License line (e.g. Licensed &amp; Insured · Lic# 123456)"
                  value={licenseText}
                  onChange={setLicenseText}
                />
              </Section>

              <button
                onClick={handleSaveContent}
                disabled={contentSaving}
                className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-xl disabled:opacity-50 mt-2 mb-8"
              >
                {contentSaving ? "Saving…" : "Save Invoice Content"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-surface border border-navy-border rounded-xl p-4 mb-4">
      <h3 className="text-xs uppercase tracking-wider text-neutral-400 font-bold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-cream text-sm focus:border-gold-dark focus:outline-none"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-navy border border-navy-border rounded-lg px-3 py-2 text-cream text-sm focus:border-gold-dark focus:outline-none resize-none"
      />
    </div>
  );
}
