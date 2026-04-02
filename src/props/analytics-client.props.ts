import type { AnalyticsOverview } from "@/services"
import type { Range } from "@/constants/analytics"
import { SubscriptionTier } from "@/types/tier";

export type AnalyticsClientProps = {
    initialData: AnalyticsOverview
    initialRange: Range
    hasYouTube: boolean
    displayName: string
    tier: SubscriptionTier
    canSeeExtendedHistory: boolean
}
