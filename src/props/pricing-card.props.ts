import {PaidSubscriptionTier, SubscriptionTier} from "@/types/tier";

export type PricingCardProps = {
    currentTier: SubscriptionTier;
    hasSubscription: boolean
    waitlistMode: boolean
    twitchLogin?: string
    variants: Record<PaidSubscriptionTier, { monthly: string; annual: string; }>
}
