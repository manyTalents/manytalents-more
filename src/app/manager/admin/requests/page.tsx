"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  checkOfficeAccess,
  listAccessRequests,
  approveAccessRequest,
  denyAccessRequest,
  type AccessRequestListItem,
} from "@/lib/frappe";

type Tab = "Pending" | "Approved" | "Denied" | "Expired";

export default function AdminRequestsPage() {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const [tab, setTab] = useState<Tab>("Pending");
  const [requests, setRequests] = useState<AccessRequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action states
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [denyReasonFor, setDenyReasonFor] = useState<string | null>(null);
  const [denyReasonText, setDenyReasonText] = useState("");
  const [flash, setFlash] = useState("");

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
        setAccessChecked(true);
      })
      .catch(() => router.replace("/manager/dashboard"));
  }, [router]);

  useEffect(() => {
    if (allowed) refreshList();
  }, [allowed, tab]);

  const refreshList = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAccessRequests(tab);
      setRequests(data || []);
    } catch (err: any) {
      setError(err.message || "Could not load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reqId: string, role?: string) => {
    setActingOn(reqId);
    setFlash("");
    try {
      const res = await approveAccessRequest({ requestId: reqId, role });
      setFlash(`Approved ${res.user_email} as ${res.role_assigned}${res.email_sent ? " — login link emailed" : ""}`);
      await refreshList();
    } catch (err: any) {
      setError(err.message || "Could not approve");
    } finally {
      setActingOn(null);
    }
  };

  const handleDeny = async (reqId: string) => {
    setActingOn(reqId);
    setFlash("");
    try {
      await denyAccessRequest({ requestId: reqId, reason: denyReasonText.trim() });
      setFlash("Request denied.");
      setDenyReasonFor(null);
      setDenyReasonText("");
      await refreshList();
    } catch (err: any) {
      setError(err.message || "Could not deny");
    } finally {
      setActingOn(null);
    }
  };

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
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

  const ago = (iso: string) => {
    if (!iso) return "";
    try {
      const ms = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(ms / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return "";
    }
  };

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!allowed) return null;

  const TABS: Tab[] = ["Pending", "Approved", "Denied", "Expired"];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/manager/dashboard"
            className="text-neutral-400 hover:text-gold-light transition"
          >
            ← Dashboard
          </Link>
          <div className="h-5 w-px bg-navy-border" />
          <div>
            <h1 className="font-serif text-lg font-bold">Access Requests</h1>
            <p className="text-xs text-neutral-500">Admin · Review, approve, or deny</p>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Flash / error */}
        {flash && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-4 py-3 text-sm text-emerald-300 mb-4">
            {flash}
          </div>
        )}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300 mb-4">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-navy-surface border border-navy-border rounded-lg mb-6 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                tab === t
                  ? "bg-gradient-to-br from-gold to-gold-dark text-navy"
                  : "text-neutral-400 hover:text-cream"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-border flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-neutral-400">
              {tab} Requests
            </span>
            <span className="text-xs text-neutral-500">
              {loading ? "Loading..." : `${requests.length} result${requests.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-neutral-500">No {tab.toLowerCase()} requests.</p>
            </div>
          ) : (
            <ul className="divide-y divide-navy-border">
              {requests.map((req) => (
                <li key={req.name} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-bold text-cream">{req.requester_name}</p>
                        <span className="text-xs text-neutral-500">
                          {ago(req.requested_at)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-400">{req.requester_email}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Role: {req.requested_role} · {fmtDate(req.requested_at)}
                      </p>
                      {req.note && (
                        <p className="text-sm text-neutral-400 italic mt-2">
                          &ldquo;{req.note}&rdquo;
                        </p>
                      )}
                      {/* Resolution info for non-pending */}
                      {req.status === "Approved" && req.approved_by && (
                        <p className="text-xs text-emerald-400 mt-2">
                          Approved by {req.approved_by} · {fmtDate(req.approved_at || "")}
                        </p>
                      )}
                      {req.status === "Denied" && req.denied_by && (
                        <p className="text-xs text-red-400 mt-2">
                          Denied by {req.denied_by} · {fmtDate(req.denied_at || "")}
                          {req.denial_reason && ` — "${req.denial_reason}"`}
                        </p>
                      )}
                    </div>

                    {/* Actions for pending */}
                    {tab === "Pending" && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleApprove(req.name, req.requested_role)}
                          disabled={actingOn === req.name}
                          className="bg-emerald-900/50 border border-emerald-800/60 text-emerald-300 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-emerald-900 transition disabled:opacity-60"
                        >
                          {actingOn === req.name ? "..." : "Approve"}
                        </button>
                        {denyReasonFor === req.name ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={denyReasonText}
                              onChange={(e) => setDenyReasonText(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleDeny(req.name)}
                              placeholder="Reason (optional)"
                              className="w-full bg-navy border border-navy-border rounded px-3 py-1.5 text-xs text-cream focus:outline-none focus:border-red-900"
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDeny(req.name)}
                                disabled={actingOn === req.name}
                                className="flex-1 bg-red-900/60 text-red-200 text-xs font-semibold px-3 py-1.5 rounded hover:bg-red-900 transition disabled:opacity-60"
                              >
                                Deny
                              </button>
                              <button
                                onClick={() => {
                                  setDenyReasonFor(null);
                                  setDenyReasonText("");
                                }}
                                className="text-xs text-neutral-500 px-2"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDenyReasonFor(req.name)}
                            className="text-xs text-neutral-500 hover:text-red-400 transition"
                          >
                            Deny
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
