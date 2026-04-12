"use client";

import { useState } from "react";
import Link from "next/link";
import { submitAccessRequest } from "@/lib/frappe";

export default function RequestAccessPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MTM Office");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ submitted: boolean; message: string } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("A valid email address is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitAccessRequest({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        note: note.trim(),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif font-extrabold mb-2">
            Many<span className="text-gold-gradient">Talents</span> Manager
          </h1>
          <p className="text-neutral-400 text-sm tracking-wider uppercase">
            Request Access
          </p>
        </div>

        <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
          {result ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-900/40 border border-emerald-700/60 text-emerald-300 text-xl mb-4">
                ✓
              </div>
              <h2 className="text-xl font-serif font-bold mb-2">Request Submitted</h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {result.message}
              </p>
              <Link
                href="/manager"
                className="inline-block mt-6 text-sm text-gold hover:text-gold-light transition"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-serif font-bold mb-2">Request Access</h2>
              <p className="text-neutral-400 text-sm mb-6">
                Submit your info and an admin will review your request. You'll get a login link once approved.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Katelyn Reverding"
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="katelyn@manytalentsmore.com"
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("MTM Office")}
                      className={`text-left p-3 rounded-lg border transition ${
                        role === "MTM Office"
                          ? "border-gold-dark bg-gold-dark/10"
                          : "border-navy-border bg-navy hover:border-neutral-700"
                      }`}
                    >
                      <p className="text-sm font-medium text-cream">MTM Office</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Office staff</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("Accounts Manager")}
                      className={`text-left p-3 rounded-lg border transition ${
                        role === "Accounts Manager"
                          ? "border-gold-dark bg-gold-dark/10"
                          : "border-navy-border bg-navy hover:border-neutral-700"
                      }`}
                    >
                      <p className="text-sm font-medium text-cream">Accounts Manager</p>
                      <p className="text-xs text-neutral-500 mt-0.5">Invoice approver</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    Note <span className="text-neutral-600">(optional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Adam told me to sign up"
                    rows={2}
                    maxLength={500}
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream text-sm focus:outline-none focus:border-gold-dark transition resize-none"
                  />
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3.5 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6">
          <Link href="/manager" className="text-neutral-500 hover:text-gold-light transition">
            Already have access? Sign in
          </Link>
        </p>

        <p className="text-center text-neutral-500 text-xs mt-4">
          &copy; 2026 ManyTalents More, LLC
        </p>
      </div>
    </div>
  );
}
