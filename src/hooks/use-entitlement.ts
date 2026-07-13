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

const fetcher = (url: string) => fetch(url).then(r => r.json()) as Promise<EntitlementState>

/**
 * Client source of paid state — reads /api/me/entitlement (DB-backed), never
 * `useSession()`: the JWT is a stale cache (see src/lib/require-pro.ts). Server
 * routes remain the enforcement; this drives degrade UI only (spec §3.5).
 */
export function useEntitlement(): EntitlementState & { isLoading: boolean } {
  const { data, isLoading } = useSWR("/api/me/entitlement", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60_000,
  })
  return {
    isPro: data?.isPro ?? false,
    plan: data?.plan ?? "free",
    status: data?.status ?? "none",
    trialEndsAt: data?.trialEndsAt ?? null,
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    graceEndsAt: data?.graceEndsAt ?? null,
    isLoading,
  }
}
