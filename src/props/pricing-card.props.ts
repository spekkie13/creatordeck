import {PaidSubscriptionTier, SubscriptionTier} from "@/types/tier";

export type PricingCardProps = {
    currentTier: SubscriptionTier;
    hasSubscription: boolean
    waitlistMode: boolean
    twitchLogin?: string
    prices: Record<PaidSubscriptionTier, { monthly: string; annual: string; }>
}
