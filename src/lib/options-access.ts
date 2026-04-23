/**
 * Options access state — localStorage-based tracking for purchases, subscriptions, admin, and disclaimer.
 */

const DISCLAIMER_KEY = 'mtm_options_disclaimer'
const ADMIN_KEY = 'mtm_options_admin'
const PURCHASE_PREFIX = 'mtm_purchase_'
const SUB_KEY = 'mtm_options_sub'

export function hasAcknowledgedDisclaimer(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DISCLAIMER_KEY) === 'true'
}

export function setDisclaimerAcknowledged() {
  if (typeof window === 'undefined') return
  localStorage.setItem(DISCLAIMER_KEY, 'true')
}

export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(ADMIN_KEY) === 'true'
}

export function setAdmin() {
  if (typeof window === 'undefined') return
  localStorage.setItem(ADMIN_KEY, 'true')
}

export function getPurchaseForRun(runId: string): { tier: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${PURCHASE_PREFIX}${runId}`)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setPurchaseForRun(runId: string, tier: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${PURCHASE_PREFIX}${runId}`, JSON.stringify({ tier }))
}

export function getSubscription(): { email: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SUB_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setSubscription(email: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SUB_KEY, JSON.stringify({ email }))
}

export function clearSubscription() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SUB_KEY)
}
