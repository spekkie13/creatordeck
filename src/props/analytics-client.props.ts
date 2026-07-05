import type { AnalyticsOverview } from "@/services"
import type { Range } from "@/constants/analytics"

export type AnalyticsClientProps = {
    initialData: AnalyticsOverview
    initialRange: Range
    hasYouTube: boolean
    displayName: string
    canSeeExtendedHistory: boolean
}
