"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, callMethod } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

interface InvoiceSettings {
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

export default function InvoiceSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!getAuth()) { router.replace("/manager"); return; }
    loadSettings();
  }, [router]);

  const loadSettings = async () => {
    try {
      const res = await callMethod("frappe.client.get", {
        doctype: "MTM Invoice Settings",
        name: "MTM Invoice Settings",
      });
      setSettings(res);
    } catch (e: any) {
      setError(e.message || "Failed to load settings");
    }
  };

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
          value: (settings as any)[field] ?? "",
        });
      }
      setSuccess("Settings saved");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Save failed");
    }
    setSaving(false);
  };

  const update = (field: string, value: string | number) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

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

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-navy p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-serif font-bold text-cream mb-6">Invoice Settings</h1>

          {error && <div className="bg-red-900/30 border border-red-500 text-red-300 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          {success && <div className="bg-green-900/30 border border-green-500 text-green-300 p-3 rounded-lg mb-4 text-sm">{success}</div>}

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

          {/* Clauses */}
          <Section title="Invoice Clauses">
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-4 pl-3 border-l-2 border-gold-dark/30">
                <Row label={`Clause ${i} Title`} value={(settings as any)[`clause_${i}_title`]} onChange={(v) => update(`clause_${i}_title`, v)} />
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
            className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-xl disabled:opacity-50 mt-2"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-navy-surface border border-navy-border rounded-xl p-4 mb-4">
      <h2 className="text-xs uppercase tracking-wider text-neutral-400 font-bold mb-3">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
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

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
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
