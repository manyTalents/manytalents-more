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
  { value: "lead_tech", label: "Lead Tech", description: "Has their own truck, goes on jobs" },
  { value: "helper", label: "Helper / Apprentice", description: "No truck, rides with a lead tech, assigned on jobs" },
  { value: "office_field", label: "Office + Mobile", description: "Web dashboard AND mobile app — for office staff who also do inventory, inspections, etc." },
  { value: "office", label: "Office Only", description: "Web dashboard only, no mobile app needed" },
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

export default function TeamPage() {
  const router = useRouter();
  const [techs, setTechs] = useState<TechListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<PersonRole>("lead_tech");
  const [van, setVan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Result
  const [result, setResult] = useState<OnboardTechResponse | null>(null);
  const [officeResult, setOfficeResult] = useState<{ email: string; name: string; inviteUrl: string } | null>(null);

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

  const handleSubmit = async () => {
    setError("");
    setResult(null);
    setOfficeResult(null);
    if (!fullName.trim()) { setError("Name is required"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Valid email is required"); return; }

    setSubmitting(true);
    try {
      if (role === "office") {
        // Office only — web dashboard + magic link, no mobile app
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
        // Office + mobile — create tech account (gets Employee + API keys for app)
        // then also give them office web access via invite link
        const techRes = await onboardTech({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          vanWarehouse: "",
        });
        // Generate web login link too
        let inviteUrl = "";
        try {
          const inviteRes = await createInvite(email.trim().toLowerCase(), false);
          inviteUrl = inviteRes.invite_url;
        } catch {
          // User might already have office access — that's fine
        }
        setResult(techRes);
        if (inviteUrl) {
          setOfficeResult({
            email: techRes.user_email,
            name: fullName.trim(),
            inviteUrl,
          });
        }
      } else {
        // Lead tech or helper — mobile app access
        const res = await onboardTech({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          vanWarehouse: role === "lead_tech" ? van : "",
        });
        setResult(res);
      }
      setFullName("");
      setEmail("");
      setVan("");
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

  const qrImageUrl = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}`
    : "";

  const selectedRoleInfo = ROLE_OPTIONS.find(r => r.value === role);

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-serif font-bold">Team Setup</h2>
          <p className="text-sm text-neutral-500 mt-1">Add techs, helpers, and office staff. Techs and helpers get a QR code for the mobile app.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Person Form */}
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Add Team Member</p>
            <div className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-2">Role</label>
                <div className="space-y-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 cursor-pointer select-none p-3 rounded-lg border transition ${
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

              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Glen Smith"
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="glen@manytalentsmore.com"
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                />
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

          {/* Result Panel */}
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            {result ? (
              /* QR code for tech / helper / office+field */
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Mobile App QR Code</p>
                <div className="text-center">
                  <p className="text-lg font-serif font-bold mb-1">{result.full_name}</p>
                  <p className="text-sm text-neutral-500 mb-1">{result.user_email}</p>
                  <p className="text-xs text-neutral-600 mb-4">
                    {result.van_warehouse
                      ? `Lead Tech — ${result.van_warehouse.replace(" - AT", "")}`
                      : officeResult ? "Office + Mobile App" : "Helper / Apprentice"
                    }
                  </p>

                  <div className="inline-block bg-white rounded-xl p-3 mb-4">
                    <img
                      src={qrImageUrl}
                      alt="QR Code for mobile app login"
                      width={280}
                      height={280}
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>

                  <p className="text-xs text-neutral-500 mb-2">
                    Open the app &rarr; Scan QR &rarr; done
                  </p>

                  {/* Also show login link if they got office access too */}
                  {officeResult && (
                    <div className="bg-navy border border-navy-border rounded-lg p-3 mt-4 mb-2 text-left">
                      <p className="text-xs text-neutral-500 mb-1">Web dashboard login link:</p>
                      <p className="text-xs text-gold font-mono break-all select-all">{officeResult.inviteUrl}</p>
                    </div>
                  )}

                  <button
                    onClick={() => { setResult(null); setOfficeResult(null); }}
                    className="mt-3 text-xs text-neutral-500 hover:text-gold-light transition"
                  >
                    Done — add another person
                  </button>
                </div>
              </div>
            ) : officeResult ? (
              /* Login link for office staff */
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Office Login Link</p>
                <div className="text-center">
                  <p className="text-lg font-serif font-bold mb-1">{officeResult.name}</p>
                  <p className="text-sm text-neutral-500 mb-4">{officeResult.email}</p>

                  <div className="bg-navy border border-navy-border rounded-lg p-4 mb-4 text-left">
                    <p className="text-xs text-neutral-500 mb-2">Send them this link to log in:</p>
                    <p className="text-sm text-gold font-mono break-all select-all">{officeResult.inviteUrl}</p>
                  </div>

                  <p className="text-xs text-neutral-500 mb-4">
                    Link expires in 15 minutes. They can request a new one from the login page after that.
                  </p>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(officeResult.inviteUrl);
                    }}
                    className="text-xs bg-navy border border-navy-border px-4 py-2 rounded-lg text-cream hover:border-gold-dark transition mb-3"
                  >
                    Copy Link
                  </button>

                  <br />
                  <button
                    onClick={() => setOfficeResult(null)}
                    className="text-xs text-neutral-500 hover:text-gold-light transition mt-2"
                  >
                    Done — add another person
                  </button>
                </div>
              </div>
            ) : (
              /* Empty state */
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Result</p>
                <div className="flex items-center justify-center h-64 text-neutral-600">
                  <div className="text-center">
                    <p className="mb-2">{selectedRoleInfo?.label || "Select a role"}</p>
                    <p className="text-xs">
                      {role === "office"
                        ? "Login link will appear here"
                        : "QR code will appear here"
                      }
                    </p>
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
                    <th className="text-center py-2 pl-4">App</th>
                  </tr>
                </thead>
                <tbody>
                  {techs.map((t) => (
                    <tr key={t.employee} className="border-b border-navy-border/50">
                      <td className="py-3 pr-4 text-cream font-medium">{t.name}</td>
                      <td className="py-3 px-4 text-neutral-400">{t.email || "—"}</td>
                      <td className="py-3 px-4 text-neutral-400">
                        {t.van ? "Lead Tech" : t.email ? "Helper" : "—"}
                      </td>
                      <td className="py-3 px-4 text-neutral-400">{t.van ? t.van.replace(" - AT", "") : "—"}</td>
                      <td className="py-3 pl-4 text-center">
                        {t.has_app_access ? (
                          <span className="text-emerald-400 text-xs font-medium">Active</span>
                        ) : (
                          <span className="text-neutral-600 text-xs">No keys</span>
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
