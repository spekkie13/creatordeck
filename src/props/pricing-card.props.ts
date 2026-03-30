import type { SubscriptionTier } from "@/lib/gates"

export type PricingCardProps = {
    currentTier: SubscriptionTier
    hasSubscription: boolean
    waitlistMode: boolean
    twitchLogin?: string
    prices: {
        tier1: { monthly: string; annual: string }
        tier2: { monthly: string; annual: string }
        tier3: { monthly: string; annual: string }
    }
}
