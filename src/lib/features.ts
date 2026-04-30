import { callMethod } from "@/lib/frappe";

const API = "hcp_replacement.hcp_replacement.api.tech_utils";
const CACHE_KEY = "mtm_feature_flags";
const CACHE_TTL = 5 * 60 * 1000;

export interface FeatureFlags {
  inventory: boolean;
  estimates: boolean;
  service_plans: boolean;
  invoicing: boolean;
  customers: boolean;
  team: boolean;
  pricebook: boolean;
  events: boolean;
  scheduling: boolean;
}

const ALL_OFF: FeatureFlags = {
  inventory: false, estimates: false, service_plans: false,
  invoicing: false, customers: false, team: false,
  pricebook: false, events: false, scheduling: false,
};

export async function fetchFeatureFlags(): Promise<FeatureFlags> {
  try {
    const flags = await callMethod<FeatureFlags>(`${API}.get_feature_flags`);
    if (typeof window !== "undefined") {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ flags, ts: Date.now() }));
    }
    return flags;
  } catch {
    return getFeatureFlags();
  }
}

export function getFeatureFlags(): FeatureFlags {
  if (typeof window === "undefined") return ALL_OFF;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return ALL_OFF;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) {
      fetchFeatureFlags().catch(() => {});
    }
    return cached.flags || ALL_OFF;
  } catch {
    return ALL_OFF;
  }
}

export function clearFeatureFlags() {
  if (typeof window !== "undefined") localStorage.removeItem(CACHE_KEY);
}

export const FLAG_TO_NAV: Record<string, keyof FeatureFlags> = {
  "/manager/pricing": "pricebook",
  "/manager/invoices": "invoicing",
  "/manager/customers": "customers",
  "/manager/estimates": "estimates",
  "/manager/service-plans": "service_plans",
  "/manager/inventory": "inventory",
  "/manager/admin/techs": "team",
  "/manager/schedule": "scheduling",
};
