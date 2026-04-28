"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAuth,
  onboardTech,
  listTechs,
  onboardNewUser,
  createInvite,
  type TechListItem,
  type OnboardTechResponse,
} from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

type PersonRole = "lead_tech" | "helper" | "office" | "office_field";

const ROLE_OPTIONS: { value: PersonRole; label: string; description: string }[] = [
  { value: "lead_tech", label: "Lead Tech", description: "Has their own truck, runs jobs" },
  { value: "helper", label: "Helper / Apprentice", description: "No truck, floats with different leads, assigned on jobs" },
  { value: "office_field", label: "Office + Mobile", description: "Web dashboard AND mobile app (e.g., Zach — office + inventory/restock)" },
  { value: "office", label: "Office Only", description: "Web dashboard only, no mobile app" },
];

const VAN_OPTIONS = [
  "Adam's Truck - AT",
  "Chris's Truck - AT",
  "Dereck's Truck - AT",
  "Glen's Truck - AT",
  "Matt's Truck - AT",
  "Tim's Truck - AT",
  "Warrens Truck - AT",
];

const DESIGNATIONS = [
  "Lead Plumber",
  "Lead Electrician",
  "Lead HVAC Tech",
  "Plumber",
  "Electrician",
  "HVAC Tech",
  "Helper",
  "Apprentice",
  "Office Manager",
  "Office Staff",
];

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function TeamPage() {
  const router = useRouter();
  const [techs, setTechs] = useState<TechListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form — basic
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PersonRole>("lead_tech");
  const [van, setVan] = useState("");

  // Form — employee details
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Result
  const [result, setResult] = useState<OnboardTechResponse | null>(null);
  const [officeResult, setOfficeResult] = useState<{ email: string; name: string; inviteUrl: string } | null>(null);

  const needsMobileApp = role !== "office";

  useEffect(() => {
    if (!getAuth()) { router.replace("/manager"); return; }
    loadTechs();
  }, [router]);

  const loadTechs = () => {
    listTechs()
      .then(setTechs)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setVan("");
    setPhone("");
    setDesignation("");
    setEmergencyName("");
    setEmergencyPhone("");
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);
    setOfficeResult(null);
    if (!fullName.trim()) { setError("Name is required"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Valid email is required"); return; }

    setSubmitting(true);
    try {
      if (role === "office") {
        const res = await onboardNewUser({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          role: "MTM Office",
          sendEmail: false,
        });
        setOfficeResult({
          email: res.user_email,
          name: fullName.trim(),
          inviteUrl: res.invite_url,
        });
      } else if (role === "office_field") {
        const techRes = await onboardTech({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          vanWarehouse: "",
          phone: phone.replace(/\D/g, ""),
          designation: designation,
          emergencyName: emergencyName.trim(),
          emergencyPhone: emergencyPhone.replace(/\D/g, ""),
        });
        let inviteUrl = "";
        try {
          const inviteRes = await createInvite(email.trim().toLowerCase(), false);
          inviteUrl = inviteRes.invite_url;
        } catch { /* already has office access */ }
        setResult(techRes);
        if (inviteUrl) {
          setOfficeResult({
            email: techRes.user_email,
            name: fullName.trim(),
            inviteUrl,
          });
        }
      } else {
        const res = await onboardTech({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          vanWarehouse: role === "lead_tech" ? van : "",
          phone: phone.replace(/\D/g, ""),
          designation: designation,
          emergencyName: emergencyName.trim(),
          emergencyPhone: emergencyPhone.replace(/\D/g, ""),
        });
        setResult(res);
      }
      resetForm();
      loadTechs();
    } catch (err: any) {
      setError(err.message || "Failed to add person");
    } finally {
      setSubmitting(false);
    }
  };

  const qrData = result ? JSON.stringify({
    site: result.site_url,
    key: result.api_key,
    secret: result.api_secret,
  }) : "";

  // QR generated via API — credentials are in the URL but this is an internal admin page
  // TODO: replace with client-side QR library (qrcode.react) to keep credentials local
  const qrImageUrl = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}`
    : "";

  const selectedRoleInfo = ROLE_OPTIONS.find(r => r.value === role);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-serif font-bold">Team Setup</h2>
          <p className="text-sm text-neutral-500 mt-1">Onboard employees, assign trucks, generate app access. Creates the full Employee record in ERPNext.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Add Person Form — 3 cols */}
          <div className="lg:col-span-3 bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Add Team Member</p>
            <div className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border transition ${
                        role === opt.value
                          ? "border-gold-dark bg-gold-dark/10"
                          : "border-navy-border bg-navy hover:border-neutral-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={opt.value}
                        checked={role === opt.value}
                        onChange={() => setRole(opt.value)}
                        className="mt-0.5 accent-gold-dark"
                      />
                      <div>
                        <span className="text-sm font-medium text-cream">{opt.label}</span>
                        <p className="text-xs text-neutral-500 mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Name + Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Glen Smith"
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="glen@manytalentsmore.com"
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  />
                </div>
              </div>

              {/* Phone + Designation row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder="(318) 555-1234"
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Designation</label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  >
                    <option value="">Select...</option>
                    {DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Truck — only for lead tech */}
              {role === "lead_tech" && (
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Truck / Van</label>
                  <select
                    value={van}
                    onChange={(e) => setVan(e.target.value)}
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  >
                    <option value="">Select truck...</option>
                    {VAN_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v.replace(" - AT", "")}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Emergency contact */}
              {needsMobileApp && (
                <div className="pt-2 border-t border-navy-border">
                  <p className="text-xs uppercase tracking-wider text-neutral-500 mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1">Name</label>
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full bg-navy border border-navy-border rounded-lg px-4 py-2.5 text-cream text-sm focus:outline-none focus:border-gold-dark transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(formatPhone(e.target.value))}
                        placeholder="(318) 555-5678"
                        className="w-full bg-navy border border-navy-border rounded-lg px-4 py-2.5 text-cream text-sm focus:outline-none focus:border-gold-dark transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
              >
                {submitting ? "Setting up..." : role === "office" ? "Add & Generate Login Link" : role === "office_field" ? "Add & Generate QR + Login Link" : "Add & Generate QR Code"}
              </button>
            </div>
          </div>

          {/* Result Panel — 2 cols */}
          <div className="lg:col-span-2 bg-navy-surface border border-navy-border rounded-2xl p-6">
            {result ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Mobile App QR Code</p>
                <div className="text-center">
                  <p className="text-lg font-serif font-bold mb-1">{result.full_name}</p>
                  <p className="text-sm text-neutral-500 mb-1">{result.user_email}</p>
                  <p className="text-xs text-neutral-600 mb-4">
                    {result.van_warehouse
                      ? `Lead Tech — ${result.van_warehouse.replace(" - AT", "")}`
                      : officeResult ? "Office + Mobile" : "Helper"
                    }
                  </p>

                  <div className="inline-block bg-white rounded-xl p-3 mb-4">
                    <img
                      src={qrImageUrl}
                      alt="QR Code for mobile app login"
                      width={240}
                      height={240}
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>

                  <p className="text-xs text-neutral-500 mb-2">
                    Open the app &rarr; Scan QR &rarr; done
                  </p>

                  {officeResult && (
                    <div className="bg-navy border border-navy-border rounded-lg p-3 mt-3 mb-2 text-left">
                      <p className="text-xs text-neutral-500 mb-1">Web dashboard login:</p>
                      <p className="text-xs text-gold font-mono break-all select-all">{officeResult.inviteUrl}</p>
                    </div>
                  )}

                  <button
                    onClick={() => { setResult(null); setOfficeResult(null); }}
                    className="mt-3 text-xs text-neutral-500 hover:text-gold-light transition"
                  >
                    Done — add another
                  </button>
                </div>
              </div>
            ) : officeResult ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Office Login Link</p>
                <div className="text-center">
                  <p className="text-lg font-serif font-bold mb-1">{officeResult.name}</p>
                  <p className="text-sm text-neutral-500 mb-4">{officeResult.email}</p>
                  <div className="bg-navy border border-navy-border rounded-lg p-4 mb-4 text-left">
                    <p className="text-xs text-neutral-500 mb-2">Send them this link:</p>
                    <p className="text-sm text-gold font-mono break-all select-all">{officeResult.inviteUrl}</p>
                  </div>
                  <p className="text-xs text-neutral-500 mb-4">Expires in 15 min. They can request a new one from the login page.</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(officeResult.inviteUrl)}
                    className="text-xs bg-navy border border-navy-border px-4 py-2 rounded-lg text-cream hover:border-gold-dark transition mb-3"
                  >
                    Copy Link
                  </button>
                  <br />
                  <button
                    onClick={() => setOfficeResult(null)}
                    className="text-xs text-neutral-500 hover:text-gold-light transition mt-2"
                  >
                    Done — add another
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Result</p>
                <div className="flex items-center justify-center h-48 text-neutral-600">
                  <div className="text-center">
                    <p className="mb-2">{selectedRoleInfo?.label || "Select a role"}</p>
                    <p className="text-xs">{role === "office" ? "Login link appears here" : "QR code appears here"}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Team List */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
            Current Team {!loading && `(${techs.length})`}
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
            </div>
          ) : techs.length === 0 ? (
            <p className="text-neutral-600 text-sm py-4">No team members set up yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-500 uppercase border-b border-navy-border">
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Role</th>
                    <th className="text-left py-2 px-4">Truck</th>
                    <th className="text-center py-2 px-4">App</th>
                    <th className="text-right py-2 pl-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {techs.map((t) => (
                    <tr key={t.employee} className="border-b border-navy-border/50">
                      <td className="py-3 pr-4 text-cream font-medium">{t.name}</td>
                      <td className="py-3 px-4 text-neutral-400 text-xs">{t.email || "—"}</td>
                      <td className="py-3 px-4 text-neutral-400">
                        {t.van ? "Lead Tech" : t.email ? "Helper" : "—"}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">{t.van ? t.van.replace(" - AT", "") : "Floats"}</td>
                      <td className="py-3 px-4 text-center">
                        {t.has_app_access ? (
                          <span className="text-emerald-400 text-xs font-medium">Active</span>
                        ) : (
                          <span className="text-neutral-600 text-xs">No keys</span>
                        )}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        {t.email && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await onboardTech({
                                  email: t.email,
                                  fullName: t.name,
                                  vanWarehouse: t.van || "",
                                });
                                setResult(res);
                                setOfficeResult(null);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              } catch (err: any) {
                                setError(err.message || "Failed to generate QR");
                              }
                            }}
                            className="text-xs text-gold hover:text-gold-light transition font-medium"
                          >
                            Generate QR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
