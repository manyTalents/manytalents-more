"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAuth,
  checkOfficeAccess,
  listApprovers,
  addApprover,
  removeApprover,
  type Approver,
} from "@/lib/frappe";

export default function ApproversPage() {
  const router = useRouter();
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

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
        setIsAdmin(!!res.is_admin);
        setAccessChecked(true);
        refreshList();
      })
      .catch(() => {
        router.replace("/manager/dashboard");
      });
  }, [router]);

  const refreshList = async () => {
    setLoading(true);
    try {
      const data = await listApprovers();
      setApprovers(data || []);
    } catch (err: any) {
      setError(err.message || "Could not load approvers");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    setError("");
    setFlash("");
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setError("Enter an email address");
      return;
    }
    setAdding(true);
    try {
      await addApprover(email);
      setFlash(`Added ${email}`);
      setNewEmail("");
      await refreshList();
      setTimeout(() => setFlash(""), 3000);
    } catch (err: any) {
      setError(err.message || "Could not add approver");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (!confirm(`Remove ${email} from the approvers list?`)) return;
    setError("");
    setFlash("");
    setRemovingEmail(email);
    try {
      await removeApprover(email);
      setFlash(`Removed ${email}`);
      await refreshList();
      setTimeout(() => setFlash(""), 3000);
    } catch (err: any) {
      setError(err.message || "Could not remove approver");
    } finally {
      setRemovingEmail(null);
    }
  };

  const fmtDate = (iso: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-navy-border bg-navy-surface/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/manager/dashboard"
            className="text-neutral-400 hover:text-gold-light transition"
          >
            ← Dashboard
          </Link>
          <div className="h-5 w-px bg-navy-border" />
          <div>
            <h1 className="font-serif text-lg font-bold">Access Approvers</h1>
            <p className="text-xs text-neutral-500">
              Admin · Who can approve access requests
            </p>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Description */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
          <p className="text-sm text-neutral-300 leading-relaxed">
            People in this list get notified when someone requests access to
            ManyTalents Manager, and can one-click approve or deny from the email.
          </p>
          <p className="text-xs text-neutral-500 mt-2">
            Any single approver can act on a request — you don&rsquo;t need consensus.
          </p>
        </div>

        {/* Flash / error */}
        {flash && (
          <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-lg px-4 py-3 text-sm text-emerald-300">
            {flash}
          </div>
        )}
        {error && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Add form (admin only) */}
        {isAdmin && (
          <div className="bg-navy-surface border border-navy-border rounded-2xl p-6">
            <h2 className="text-sm uppercase tracking-wider text-neutral-400 mb-4">
              Add Approver
            </h2>
            <div className="flex gap-3">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="adam@manytalentsmore.com"
                className="flex-1 bg-navy border border-navy-border rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-gold-dark transition"
              />
              <button
                onClick={handleAdd}
                disabled={adding || !newEmail.trim()}
                className="bg-gradient-to-br from-gold to-gold-dark text-navy font-bold px-6 rounded-lg hover:from-gold-light hover:to-gold transition disabled:opacity-60"
              >
                {adding ? "Adding..." : "Add"}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              User must already have a Frappe account. To onboard a brand-new
              person, use{" "}
              <Link href="/manager/admin/invite" className="text-gold hover:text-gold-light">
                Office Staff Access
              </Link>{" "}
              first.
            </p>
          </div>
        )}

        {/* Approvers list */}
        <div className="bg-navy-surface border border-navy-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-border flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-neutral-400">
              Current Approvers
            </h2>
            <span className="text-xs text-neutral-500">
              {loading ? "Loading..." : `${approvers.length} ${approvers.length === 1 ? "person" : "people"}`}
            </span>
          </div>

          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="h-6 w-6 rounded-full border-2 border-gold-dark border-t-transparent animate-spin" />
            </div>
          ) : approvers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-neutral-500">No approvers configured yet.</p>
              {isAdmin && (
                <p className="text-xs text-neutral-600 mt-2">
                  Add at least one person above so access requests can be approved.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-navy-border">
              {approvers.map((a) => (
                <li
                  key={a.user_email}
                  className="px-6 py-4 flex items-center gap-4 hover:bg-navy/40 transition"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold/20 to-gold-dark/20 border border-gold-dark/30 flex items-center justify-center text-gold font-bold text-sm">
                    {(a.display_name || a.user_email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-cream font-medium truncate">
                      {a.display_name || a.user_email}
                    </p>
                    {a.display_name && (
                      <p className="text-xs text-neutral-500 truncate">{a.user_email}</p>
                    )}
                    {a.added_on && (
                      <p className="text-xs text-neutral-600 mt-0.5">
                        Added {fmtDate(a.added_on)}
                        {a.added_by && a.added_by !== "Administrator" && ` by ${a.added_by}`}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemove(a.user_email)}
                      disabled={removingEmail === a.user_email || approvers.length <= 1}
                      className="text-xs text-neutral-500 hover:text-red-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        approvers.length <= 1
                          ? "Cannot remove the last approver"
                          : "Remove"
                      }
                    >
                      {removingEmail === a.user_email ? "Removing..." : "Remove"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isAdmin && (
          <p className="text-xs text-neutral-500 text-center">
            Only System Managers can add or remove approvers.
          </p>
        )}
      </main>
    </div>
  );
}
