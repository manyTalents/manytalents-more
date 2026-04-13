/**
 * Money auth — simple password-gated access.
 * Mirrors the Manager pattern (frappe.ts getAuth/setAuth/clearAuth)
 * but uses a single Bearer token instead of Frappe API key pairs.
 */

export interface MoneyAuth {
  token: string;
}

const AUTH_KEY = "mtm_money_auth";

export function getMoneyAuth(): MoneyAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setMoneyAuth(auth: MoneyAuth) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearMoneyAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
}
