"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMoneyAuth, setMoneyAuth } from "@/lib/money-auth";

export default function MoneyLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getMoneyAuth()) {
      router.replace("/money/hub");
    }
  }, [router]);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("Enter your password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/money/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid password");
      }
      const { token } = await res.json();
      setMoneyAuth({ token });
      router.replace("/money/hub");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-extrabold mb-2">
            Many<span className="text-gold-gradient">Talents</span> Money
          </h1>
          <p className="text-neutral-400 text-sm tracking-wider uppercase">
            Grow what&apos;s entrusted
          </p>
        </div>

        <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
          <h2 className="text-xl font-serif font-bold mb-6">Sign In</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your password"
                autoFocus
                className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3.5 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Enter Money"}
            </button>
          </div>
        </div>

        <p className="text-center text-neutral-500 text-xs mt-6">
          <Link href="/" className="hover:text-gold-light transition">
            &larr; Back to ManyTalents More
          </Link>
        </p>

        <p className="text-center text-neutral-500 text-xs mt-4">
          &copy; 2026 ManyTalents More, LLC
        </p>
      </div>
    </div>
  );
}
