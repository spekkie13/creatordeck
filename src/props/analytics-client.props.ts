import type { AnalyticsOverview } from "@/services"
import type { SubscriptionTier } from "@/lib/gates"
import type { Range } from "@/constants/analytics"

export type AnalyticsClientProps = {
    initialData: AnalyticsOverview
    initialRange: Range
    hasYouTube: boolean
    displayName: string
    tier: SubscriptionTier
    canSeeExtendedHistory: boolean
}
