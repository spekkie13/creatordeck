export type SubscriptionTier = "free" | "tier1" | "tier2" | "tier3"

const TIER_RANK: Record<SubscriptionTier, number> = {
  free:  0,
  tier1: 1,
  tier2: 2,
  tier3: 3,
}

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free:  "Free",
  tier1: "Tier 1",
  tier2: "Tier 2",
  tier3: "Tier 3",
}

export const TIER_MONTHLY_PRICES: Record<SubscriptionTier, string> = {
  free:  "Free",
  tier1: "$4.99/mo",
  tier2: "$11.99/mo",
  tier3: "$19.99/mo",
}

export const TIER_ANNUAL_PRICES: Record<SubscriptionTier, string> = {
  free:  "Free",
  tier1: "$49.99/yr",
  tier2: "$124.99/yr",
  tier3: "$199.99/yr",
}

/** @deprecated use TIER_MONTHLY_PRICES or TIER_ANNUAL_PRICES */
export const TIER_PRICES = TIER_MONTHLY_PRICES

/**
 * Maps Stripe price IDs to their subscription tier.
 * Populated at runtime from env vars — used in webhook handler.
 */
export function buildPriceTierMap(prices: {
  tier1: { monthly: string; annual: string }
  tier2: { monthly: string; annual: string }
  tier3: { monthly: string; annual: string }
}): Record<string, SubscriptionTier> {
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
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier]
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