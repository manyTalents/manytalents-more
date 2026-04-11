"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getAuth,
  setAuth,
  testConnection,
  redeemInvite,
  requestLoginLink,
} from "@/lib/frappe";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Manual login state
  const [siteUrl, setSiteUrl] = useState("https://manytalentsmore.v.frappe.cloud");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);

  // Magic-link redemption state
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");

  // Self-service state
  const [linkEmail, setLinkEmail] = useState("");
  const [linkStatus, setLinkStatus] = useState<
    { kind: "idle" | "sending" | "sent" | "error"; message?: string; fallbackUrl?: string }
  >({ kind: "idle" });

  // Auto-redeem magic link from ?invite=TOKEN
  useEffect(() => {
    const token = searchParams.get("invite");
    if (token) {
      setRedeeming(true);
      setRedeemError("");
      redeemInvite(token)
        .then((creds) => {
          setAuth({
            siteUrl: creds.site_url || "https://manytalentsmore.v.frappe.cloud",
            apiKey: creds.api_key,
            apiSecret: creds.api_secret,
          });
          router.replace("/manager/dashboard");
        })
        .catch((err) => {
          setRedeemError(err.message || "This login link is invalid or expired.");
          setRedeeming(false);
          // Strip the invite token from URL so refresh doesn't retry
          const url = new URL(window.location.href);
          url.searchParams.delete("invite");
          window.history.replaceState({}, "", url.toString());
        });
      return;
    }
    // No token — auto-redirect if already logged in
    if (getAuth()) {
      router.replace("/manager/dashboard");
    }
  }, [router, searchParams]);

  const handleLogin = async () => {
    if (!siteUrl || !apiKey || !apiSecret) {
      setError("All fields are required");
      return;
    }
    setTesting(true);
    setError("");
    try {
      await testConnection({ siteUrl, apiKey, apiSecret });
      setAuth({ siteUrl, apiKey, apiSecret });
      router.replace("/manager/dashboard");
    } catch (err: any) {
      setError(err.message || "Connection failed");
    }
    setTesting(false);
  };

  const handleSendLink = async () => {
    if (!linkEmail.trim()) {
      setLinkStatus({ kind: "error", message: "Enter your email address" });
      return;
    }
    setLinkStatus({ kind: "sending" });
    try {
      const res = await requestLoginLink(linkEmail.trim().toLowerCase());
      if (res.sent) {
        setLinkStatus({ kind: "sent", message: res.message });
      } else {
        setLinkStatus({
          kind: "error",
          message: res.message || "Could not send login link.",
          fallbackUrl: res.admin_fallback_url,
        });
      }
    } catch (err: any) {
      setLinkStatus({ kind: "error", message: err.message || "Could not send login link." });
    }
  };

  // Redeeming spinner screen
  if (redeeming) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block h-10 w-10 rounded-full border-2 border-gold-dark border-t-transparent animate-spin mb-6" />
          <h1 className="text-2xl font-serif font-bold mb-2">Signing you in...</h1>
          <p className="text-neutral-400 text-sm">One moment while we verify your login link.</p>
        </div>
      </div>
    );
  }

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

        {redeemError && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-4 mb-6">
            <p className="text-red-300 text-sm font-medium mb-1">Login link problem</p>
            <p className="text-red-300/80 text-sm">{redeemError}</p>
            <p className="text-red-300/60 text-xs mt-2">Request a new link below.</p>
          </div>
        )}

        <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
          <h2 className="text-xl font-serif font-bold mb-6">Sign In</h2>

          {/* Self-service login link form */}
          {linkStatus.kind === "sent" ? (
            <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg p-5">
              <p className="text-emerald-300 font-medium mb-1">Check your inbox</p>
              <p className="text-emerald-300/80 text-sm">{linkStatus.message}</p>
              <button
                onClick={() => {
                  setLinkEmail("");
                  setLinkStatus({ kind: "idle" });
                }}
                className="mt-4 text-xs text-emerald-300/60 hover:text-emerald-300 underline"
              >
                Send another link
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                  Your Email
                </label>
                <input
                  type="email"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendLink()}
                  placeholder="you@manytalentsmore.com"
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                />
              </div>

              {linkStatus.kind === "error" && (
                <div>
                  <p className="text-red-400 text-sm">{linkStatus.message}</p>
                  {linkStatus.fallbackUrl && (
                    <div className="mt-2 p-3 bg-navy border border-navy-border rounded text-xs">
                      <p className="text-neutral-500 mb-1">Admin fallback URL:</p>
                      <p className="text-gold font-mono break-all">{linkStatus.fallbackUrl}</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSendLink}
                disabled={linkStatus.kind === "sending"}
                className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3.5 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
              >
                {linkStatus.kind === "sending" ? "Sending..." : "Email Me a Login Link"}
              </button>

              <p className="text-center text-xs text-neutral-500 mt-1">
                Expires in 15 minutes · one-time use
              </p>
            </div>
          )}

          {/* Manual login (collapsed) */}
          <div className="mt-8 pt-6 border-t border-navy-border">
            {!showManual ? (
              <button
                onClick={() => setShowManual(true)}
                className="text-xs text-neutral-500 hover:text-gold-light transition w-full text-center"
              >
                Use API key instead
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-wider text-neutral-400">
                  Manual Sign In
                </p>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
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
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
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
                  <label className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">
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
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button
                  onClick={handleLogin}
                  disabled={testing}
                  className="w-full bg-navy border border-gold-dark text-gold font-bold py-3 rounded-lg hover:bg-gold-dark hover:text-navy transition disabled:opacity-60"
                >
                  {testing ? "Signing in..." : "Sign In With API Key"}
                </button>
                <button
                  onClick={() => setShowManual(false)}
                  className="text-xs text-neutral-500 hover:text-gold-light w-full text-center"
                >
                  ← Back
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-neutral-500 text-xs mt-6">
          &copy; 2026 ManyTalents More, LLC
        </p>
      </div>
    </div>
  );
}
