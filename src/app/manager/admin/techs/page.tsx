"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onboardTech, listTechs, type TechListItem, type OnboardTechResponse } from "@/lib/frappe";
import NavBar from "@/app/manager/components/NavBar";

const VAN_OPTIONS = [
  "",
  "Adam's Truck - AT",
  "Chris's Truck - AT",
  "Dereck's Truck - AT",
  "Glen's Truck - AT",
  "Matt's Truck - AT",
  "Tim's Truck - AT",
  "Warrens Truck - AT",
];

export default function TechOnboardingPage() {
  const router = useRouter();
  const [techs, setTechs] = useState<TechListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [van, setVan] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // QR result
  const [result, setResult] = useState<OnboardTechResponse | null>(null);

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
    if (!fullName.trim()) { setError("Name is required"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Valid email is required"); return; }

    setSubmitting(true);
    try {
      const res = await onboardTech({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        vanWarehouse: van,
      });
      setResult(res);
      setFullName("");
      setEmail("");
      setVan("");
      loadTechs();
    } catch (err: any) {
      setError(err.message || "Failed to create tech");
    } finally {
      setSubmitting(false);
    }
  };

  const qrData = result ? JSON.stringify({
    site: result.site_url,
    key: result.api_key,
    secret: result.api_secret,
  }) : "";

  // Generate QR code via a public API (no npm dependency needed)
  const qrImageUrl = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}`
    : "";

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h2 className="text-2xl font-serif font-bold">Tech Onboarding</h2>
          <p className="text-sm text-neutral-500 mt-1">Add a tech, assign their truck, get a QR code for the mobile app.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Add Tech Form */}
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Add New Tech</p>
            <div className="space-y-4">
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
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">Truck / Van</label>
                <select
                  value={van}
                  onChange={(e) => setVan(e.target.value)}
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                >
                  <option value="">No truck assigned</option>
                  {VAN_OPTIONS.filter(Boolean).map((v) => (
                    <option key={v} value={v}>{v.replace(" - AT", "")}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Add Tech & Generate QR"}
              </button>
            </div>
          </div>

          {/* QR Code Result */}
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">Mobile App QR Code</p>
            {result ? (
              <div className="text-center">
                <p className="text-lg font-serif font-bold mb-1">{result.full_name}</p>
                <p className="text-sm text-neutral-500 mb-4">{result.user_email}</p>

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
                  Tech opens the app &rarr; Scan QR &rarr; they're logged in
                </p>

                {result.van_warehouse && (
                  <p className="text-xs text-neutral-400">
                    Truck: <span className="text-cream">{result.van_warehouse.replace(" - AT", "")}</span>
                  </p>
                )}

                <button
                  onClick={() => setResult(null)}
                  className="mt-4 text-xs text-neutral-500 hover:text-gold-light transition"
                >
                  Done — add another tech
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-neutral-600">
                <p className="text-center">
                  Add a tech on the left<br />
                  <span className="text-xs">QR code appears here</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Current Tech List */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-xs uppercase tracking-wider text-neutral-400 mb-4">
            Current Techs {!loading && `(${techs.length})`}
          </p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
            </div>
          ) : techs.length === 0 ? (
            <p className="text-neutral-600 text-sm py-4">No techs set up yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-500 uppercase border-b border-navy-border">
                    <th className="text-left py-2 pr-4">Name</th>
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Truck</th>
                    <th className="text-center py-2 pl-4">App</th>
                  </tr>
                </thead>
                <tbody>
                  {techs.map((t) => (
                    <tr key={t.employee} className="border-b border-navy-border/50">
                      <td className="py-3 pr-4 text-cream font-medium">{t.name}</td>
                      <td className="py-3 px-4 text-neutral-400">{t.email || "—"}</td>
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
