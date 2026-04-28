"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/app/manager/components/NavBar";
import {
  getAuth,
  checkOfficeAccess,
  createInvite,
  onboardNewUser,
} from "@/lib/frappe";

type Mode = "existing" | "new";
type OfficeRole = "MTM Office" | "Accounts Manager" | "System Manager";

export default function AdminInvitePage() {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [mode, setMode] = useState<Mode>("existing");

  // Shared fields
  const [email, setEmail] = useState("");
  const [alsoSendEmail, setAlsoSendEmail] = useState(true);

  // Onboard-new fields
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<OfficeRole>("MTM Office");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<
    {
      url: string;
      expiresAt: string;
      emailSent: boolean;
      kind: Mode;
      userEmail: string;
      roleAssigned?: string;
    } | null
  >(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getAuth()) {
      router.replace("/manager");
      return;
    }
    checkOfficeAccess()
      .then((res) => {
        if (!res.is_office) {
          router.replace("/manager/dashboard");
          return;
        }
        setAllowed(true);
        setIsAdmin(!!res.is_admin);
      })
      .catch(() => {
        router.replace("/manager/dashboard");
      })
      .finally(() => setAccessChecked(true));
  }, [router]);

  const handleSubmit = async () => {
    setError("");
    setResult(null);
    setCopied(false);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (mode === "new" && !fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "existing") {
        const res = await createInvite(email.trim().toLowerCase(), alsoSendEmail);
        setResult({
          url: res.invite_url,
          expiresAt: res.expires_at,
          emailSent: res.email_sent,
          kind: "existing",
          userEmail: email.trim().toLowerCase(),
        });
      } else {
        const res = await onboardNewUser({
          email: email.trim().toLowerCase(),
          fullName: fullName.trim(),
          role,
          sendEmail: alsoSendEmail,
        });
        setResult({
          url: res.invite_url,
          expiresAt: res.expires_at,
          emailSent: res.email_sent,
          kind: "new",
          userEmail: res.user_email,
          roleAssigned: res.role_assigned,
        });
      }
    } catch (err: any) {
      setError(err.message || "Could not create invite");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setFullName("");
    setRole("MTM Office");
    setResult(null);
    setError("");
    setCopied(false);
  };

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen">
      <NavBar />

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
          {!result ? (
            <>
              {/* Mode toggle */}
              <div className="flex gap-2 p-1 bg-navy border border-navy-border rounded-lg mb-6">
                <button
                  onClick={() => {
                    setMode("existing");
                    setError("");
                  }}
                  className={`flex-1 text-sm font-medium py-2.5 rounded-md transition ${
                    mode === "existing"
                      ? "bg-gradient-to-br from-gold to-gold-dark text-navy"
                      : "text-neutral-400 hover:text-cream"
                  }`}
                >
                  Invite Existing User
                </button>
                <button
                  onClick={() => {
                    setMode("new");
                    setError("");
                  }}
                  className={`flex-1 text-sm font-medium py-2.5 rounded-md transition ${
                    mode === "new"
                      ? "bg-gradient-to-br from-gold to-gold-dark text-navy"
                      : "text-neutral-400 hover:text-cream"
                  }`}
                >
                  Onboard New User
                </button>
              </div>

              <h2 className="text-xl font-serif font-bold mb-2">
                {mode === "existing"
                  ? "Invite an Existing Office User"
                  : "Onboard a New Office User"}
              </h2>
              <p className="text-neutral-400 text-sm mb-6">
                {mode === "existing"
                  ? "Generate a one-time login link for a user who already has an office role. Link expires in 15 minutes."
                  : "Create a Frappe user account, assign a role, and generate a login link — all in one step."}
              </p>

              <div className="space-y-4">
                {mode === "new" && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                      placeholder="Katelyn Reverding"
                      className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                    {mode === "existing" ? "User Email" : "Work Email"}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    placeholder="katelyn@manytalentsmore.com"
                    className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
                  />
                  {mode === "existing" && (
                    <p className="text-xs text-neutral-500 mt-1.5">
                      User must already exist and have an office role.
                    </p>
                  )}
                </div>

                {mode === "new" && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                      Role
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(
                        [
                          {
                            value: "MTM Office",
                            label: "MTM Office",
                            desc: "Office staff — default",
                          },
                          {
                            value: "Accounts Manager",
                            label: "Accounts Manager",
                            desc: "Invoice approver",
                          },
                          {
                            value: "System Manager",
                            label: "System Manager",
                            desc: "Full admin",
                          },
                        ] as Array<{ value: OfficeRole; label: string; desc: string }>
                      )
                        .filter(
                          (opt) => opt.value !== "System Manager" || isAdmin
                        )
                        .map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setRole(opt.value)}
                            className={`text-left p-3 rounded-lg border transition ${
                              role === opt.value
                                ? "border-gold-dark bg-gold-dark/10"
                                : "border-navy-border bg-navy hover:border-neutral-700"
                            }`}
                          >
                            <p className="text-sm font-medium text-cream">{opt.label}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                    </div>
                    {!isAdmin && (
                      <p className="text-xs text-neutral-500 mt-1.5">
                        Only System Managers can assign the System Manager role.
                      </p>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer select-none pt-2">
                  <input
                    type="checkbox"
                    checked={alsoSendEmail}
                    onChange={(e) => setAlsoSendEmail(e.target.checked)}
                    className="w-4 h-4 accent-gold-dark"
                  />
                  <span className="text-sm text-neutral-300">
                    Also email the login link to the user
                  </span>
                </label>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3.5 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
                >
                  {submitting
                    ? mode === "new"
                      ? "Creating user..."
                      : "Generating..."
                    : mode === "new"
                    ? "Create User & Generate Link"
                    : "Generate Invite Link"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-900/40 border border-emerald-700/60 text-emerald-300">
                  ✓
                </span>
                <h2 className="text-xl font-serif font-bold">
                  {result.kind === "new" ? "User Created" : "Invite Created"}
                </h2>
              </div>

              {result.kind === "new" && (
                <div className="mb-4 p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg">
                  <p className="text-sm text-emerald-300">
                    Account created for <strong>{result.userEmail}</strong> with role{" "}
                    <strong>{result.roleAssigned}</strong>.
                  </p>
                </div>
              )}

              <p className="text-neutral-400 text-sm mb-6">
                {result.emailSent
                  ? `Login link emailed to ${result.userEmail}. You can also share this URL directly:`
                  : `Share this URL with the user (email not sent${
                      alsoSendEmail ? " — check email config" : ""
                    }):`}
              </p>

              <div className="bg-navy border border-navy-border rounded-xl p-4 mb-4">
                <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">
                  Magic-link URL
                </p>
                <p className="font-mono text-xs text-gold break-all leading-relaxed">
                  {result.url}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-500 mb-6">
                <span>Expires in 15 minutes · one-time use</span>
                <span className="font-mono">{result.expiresAt}</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-lg hover:from-gold-light hover:to-gold transition"
                >
                  {copied ? "Copied!" : "Copy URL"}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 bg-navy border border-navy-border text-cream font-bold py-3 rounded-lg hover:border-gold-dark transition"
                >
                  {result.kind === "new" ? "Onboard Another" : "Generate Another"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-neutral-500 text-xs mt-6">
          Office users can also self-service at <span className="text-gold">/manager</span> using
          &ldquo;Email me a login link.&rdquo;
        </p>
      </main>
    </div>
  );
}
