"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import {
  getAccessRequestByToken,
  approveAccessRequest,
  denyAccessRequest,
  type AccessRequestInfo,
} from "@/lib/frappe";

export default function ApprovePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
        </div>
      }
    >
      <ApprovePageInner />
    </Suspense>
  );
}

function ApprovePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const actionParam = searchParams.get("action");

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<AccessRequestInfo | null>(null);
  const [loadError, setLoadError] = useState("");

  const [mode, setMode] = useState<"review" | "deny">(
    actionParam === "deny" ? "deny" : "review"
  );
  const [selectedRole, setSelectedRole] = useState("");
  const [denyReason, setDenyReason] = useState("");
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<
    | { kind: "approved"; email: string; role: string; inviteUrl: string; emailSent: boolean }
    | { kind: "denied"; email: string }
    | null
  >(null);
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    getAccessRequestByToken(token)
      .then((req) => {
        setRequest(req);
        setSelectedRole(req.requested_role);
      })
      .catch((err) => {
        setLoadError(err.message || "Could not load this request.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async () => {
    setActing(true);
    setActionError("");
    try {
      const res = await approveAccessRequest({ token, role: selectedRole });
      setResult({
        kind: "approved",
        email: res.user_email,
        role: res.role_assigned,
        inviteUrl: res.invite_url,
        emailSent: res.email_sent,
      });
    } catch (err: any) {
      setActionError(err.message || "Could not approve.");
    } finally {
      setActing(false);
    }
  };

  const handleDeny = async () => {
    setActing(true);
    setActionError("");
    try {
      const res = await denyAccessRequest({ token, reason: denyReason.trim() });
      setResult({ kind: "denied", email: res.requester_email });
    } catch (err: any) {
      setActionError(err.message || "Could not deny.");
    } finally {
      setActing(false);
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const fmtDate = (iso: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 rounded-full border-2 border-gold-dark border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-neutral-400 text-sm">Loading request...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-8">
            <p className="text-red-300 font-medium mb-2">Cannot load request</p>
            <p className="text-red-300/70 text-sm">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!request) return null;

  // Already acted on
  if (request.status !== "Pending" && !result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
            <p className="text-neutral-300 font-medium mb-2">
              Request already {request.status.toLowerCase()}
            </p>
            <p className="text-neutral-500 text-sm">
              {request.requester_name} ({request.requester_email})
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Result screen
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
            {result.kind === "approved" ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-emerald-900/40 border border-emerald-700/60 text-emerald-300 text-lg">
                    ✓
                  </span>
                  <div>
                    <h2 className="text-xl font-serif font-bold">Approved</h2>
                    <p className="text-emerald-300/80 text-sm">
                      {result.email} — {result.role}
                    </p>
                  </div>
                </div>
                <p className="text-neutral-400 text-sm mb-4">
                  {result.emailSent
                    ? `Login link sent to ${result.email}.`
                    : `Login link created but email not sent (check email config). Share the URL manually:`}
                </p>
                <div className="bg-navy border border-navy-border rounded-xl p-4 mb-4">
                  <p className="font-mono text-xs text-gold break-all leading-relaxed">
                    {result.inviteUrl}
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(result.inviteUrl)}
                  className="w-full bg-gradient-to-br from-gold to-gold-dark text-navy font-bold py-3 rounded-lg hover:from-gold-light hover:to-gold transition"
                >
                  {copied ? "Copied!" : "Copy Login Link"}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-red-900/40 border border-red-700/60 text-red-300 text-lg">
                    ✕
                  </span>
                  <div>
                    <h2 className="text-xl font-serif font-bold">Denied</h2>
                    <p className="text-neutral-400 text-sm">{result.email}</p>
                  </div>
                </div>
                <p className="text-neutral-500 text-sm">
                  The requester can submit a new request if needed.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Review / Deny form
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif font-extrabold mb-1">
            Many<span className="text-gold-gradient">Talents</span> Manager
          </h1>
          <p className="text-neutral-400 text-sm">Access Request Review</p>
        </div>

        <div className="bg-navy-surface border border-navy-border rounded-2xl p-8">
          {/* Request details */}
          <div className="bg-navy border border-navy-border rounded-xl p-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-bold text-cream">{request.requester_name}</p>
                <p className="text-sm text-neutral-400">{request.requester_email}</p>
                <p className="text-xs text-neutral-500 mt-2">
                  Requested: <strong className="text-neutral-300">{request.requested_role}</strong>
                  {request.requested_at && (
                    <span className="ml-2">· {fmtDate(request.requested_at)}</span>
                  )}
                </p>
              </div>
              <span className="text-xs bg-amber-900/40 border border-amber-800/60 text-amber-300 px-2.5 py-1 rounded-full">
                Pending
              </span>
            </div>
            {request.note && (
              <div className="mt-3 pt-3 border-t border-navy-border">
                <p className="text-sm text-neutral-400 italic">&ldquo;{request.note}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 p-1 bg-navy border border-navy-border rounded-lg mb-6">
            <button
              onClick={() => setMode("review")}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition ${
                mode === "review"
                  ? "bg-emerald-900/50 text-emerald-300"
                  : "text-neutral-400 hover:text-cream"
              }`}
            >
              Approve
            </button>
            <button
              onClick={() => setMode("deny")}
              className={`flex-1 text-sm font-medium py-2 rounded-md transition ${
                mode === "deny"
                  ? "bg-red-900/50 text-red-300"
                  : "text-neutral-400 hover:text-cream"
              }`}
            >
              Deny
            </button>
          </div>

          {mode === "review" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                  Assign Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["MTM Office", "Accounts Manager"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`text-left p-3 rounded-lg border transition ${
                        selectedRole === r
                          ? "border-gold-dark bg-gold-dark/10"
                          : "border-navy-border bg-navy hover:border-neutral-700"
                      }`}
                    >
                      <p className="text-sm font-medium text-cream">{r}</p>
                    </button>
                  ))}
                </div>
                {selectedRole !== request.requested_role && (
                  <p className="text-xs text-amber-400 mt-1.5">
                    Overriding requested role ({request.requested_role})
                  </p>
                )}
              </div>

              {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

              <button
                onClick={handleApprove}
                disabled={acting}
                className="w-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-bold py-3.5 rounded-lg hover:from-emerald-500 hover:to-emerald-600 transition disabled:opacity-60"
              >
                {acting ? "Creating account..." : "Approve & Send Login Link"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-400 mb-1.5">
                  Reason <span className="text-neutral-600">(optional)</span>
                </label>
                <textarea
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  placeholder="e.g. Not hiring at this time"
                  rows={2}
                  maxLength={500}
                  className="w-full bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream text-sm focus:outline-none focus:border-red-900 transition resize-none"
                />
              </div>

              {actionError && <p className="text-red-400 text-sm">{actionError}</p>}

              <button
                onClick={handleDeny}
                disabled={acting}
                className="w-full bg-red-900/60 border border-red-800/60 text-red-200 font-bold py-3.5 rounded-lg hover:bg-red-900 transition disabled:opacity-60"
              >
                {acting ? "Denying..." : "Deny Request"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
