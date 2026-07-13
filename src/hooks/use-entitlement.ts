"use client"

import useSWR from "swr"

export type EntitlementState = {
  isPro: boolean
  plan: "free" | "pro"
  status: "none" | "trialing" | "active" | "canceled_active" | "past_due" | "revoked"
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  graceEndsAt: string | null
}

const EMPTY: EntitlementState = {
  isPro: false,
  plan: "free",
  status: "none",
  trialEndsAt: null,
  currentPeriodEnd: null,
  graceEndsAt: null,
}

// Throw on non-2xx so SWR keeps the last good data (and retries) instead of a
// transient 401/500 silently degrading a Pro user's UI to locked state.
async function fetcher(url: string): Promise<EntitlementState> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`entitlement fetch failed: ${res.status}`)
  return res.json()
}

/**
 * Client source of paid state — reads /api/me/entitlement (DB-backed), never
 * `useSession()`: the JWT is a stale cache (see src/lib/require-pro.ts). Server
 * routes remain the enforcement; this drives degrade UI only (spec §3.5).
 * No polling: entitlement changes are rare (webhook-driven), so revalidate on
 * focus/mount covers freshness without a per-minute request from every tab.
 */
export function useEntitlement(): EntitlementState & { isLoading: boolean } {
  const { data, isLoading } = useSWR("/api/me/entitlement", fetcher, {
    revalidateOnFocus: true,
  })
  return { ...EMPTY, ...data, isLoading }
}
