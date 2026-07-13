/**
 * The billing model is a single paid tier: Free vs Pro (spec §2).
 * Pro is granted via `hasPro` (see src/lib/require-pro.ts) — never inferred
 * from a rank or a scattered plan check.
 */
export type Plan = "free" | "pro"

export type BillingCycle = "monthly" | "yearly"

/** Pro pricing (EUR; Polar is merchant of record and handles VAT). Must match
 * the Polar products (POLAR_PRODUCT_PRO_MONTHLY/YEARLY) — checkout charges
 * whatever Polar has; this is display-only. */
export const PRO_PRICING: Record<BillingCycle, { amount: string; period: string }> = {
  monthly: { amount: "€12.99", period: "/mo" },
  yearly: { amount: "€129.99", period: "/yr" },
}
