"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, setAuth, testConnection } from "@/lib/frappe";

export default function LoginPage() {
  const router = useRouter();
  const [siteUrl, setSiteUrl] = useState("https://manytalentsmore.v.frappe.cloud");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  // Auto-redirect if already logged in
  useEffect(() => {
    if (getAuth()) {
      router.replace("/manager/dashboard");
    }
  }, [router]);

  const handleLogin = async () => {
    if (!siteUrl || !apiKey || !apiSecret) {
      setError("All fields are required");
      return;
    }
    setTesting(true);
    setError("");
    try {
      const user = await testConnection({ siteUrl, apiKey, apiSecret });
      setAuth({ siteUrl, apiKey, apiSecret });
      router.replace("/manager/dashboard");
    } catch (err: any) {
      setError(err.message || "Connection failed");
    }
    setTesting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-extrabold mb-2">
            Many<span className="text-gold-gradient">Talents</span> Manager
          </h1>
          <p className="text-neutral-400 text-sm tracking-wider uppercase">
            Office Dashboard
          </p>
        </div>

        <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
          <h2 className="text-xl font-serif font-bold mb-6">Sign In</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                Site URL
              </label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your API key"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-gold-dark transition"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                API Secret
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Paste your API secret"
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream font-mono text-sm focus:outline-none focus:border-gold-dark transition"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={testing}
              className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3.5 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
            >
              {testing ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>

        <p className="text-center text-neutral-500 text-xs mt-6">
          &copy; 2026 ManyTalents More, LLC
        </p>
      </div>
    </div>
  );
}
