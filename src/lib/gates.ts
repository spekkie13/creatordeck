import {PaidSubscriptionTier, SubscriptionTier, Tier} from "@/types/tier";

/**
 * Maps Stripe price IDs to their subscription tier.
 * Populated at runtime from env vars — used in webhook handler.
 */
export function buildPriceTierMap(prices: {
  tier1: { monthly: string; annual: string }
  tier2: { monthly: string; annual: string }
  tier3: { monthly: string; annual: string }
}): Record<string, PaidSubscriptionTier> {
  return {
    [prices.tier1.monthly]: "tier1",
    [prices.tier1.annual]:  "tier1",
    [prices.tier2.monthly]: "tier2",
    [prices.tier2.annual]:  "tier2",
    [prices.tier3.monthly]: "tier3",
    [prices.tier3.annual]:  "tier3",
  }
}

/** Returns true if userTier meets or exceeds the requiredTier. */
export function hasAccess(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return Tier.from(userTier).meetsOrExceeds(Tier.from(requiredTier));
}

/**
 * Central feature gate registry.
 * Each key maps to the minimum tier required to access that feature.
 * Add new gates here as features are built — gates are checked via hasAccess().
 */
export const GATES = {
  // Analytics
  analyticsRange30d:  "tier1",
  analyticsRange90d:  "tier1",

  // Tier 2
  customAlerts:       "tier2",
  streamInfoEdit:     "tier2",
  crossPlatformGoals: "tier2",

  // Tier 3
  aiAnalysis:         "tier3",
  vodTranscription:   "tier3",
  weeklyReport:       "tier3",
} as const satisfies Record<string, SubscriptionTier>

export type GateKey = keyof typeof GATES
