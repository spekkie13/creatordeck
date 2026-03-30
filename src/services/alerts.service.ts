import type { LiveEvent } from "@/types/events"

import { TWITCH_TIER_LABEL } from "@/lib/event-types"
import { formatAmount } from "@/lib/format"

export function alertSubtitle(event: LiveEvent): string | null {
    if (event.type === "sub") {
        if (event.subKind === "community_gift" && event.amount != null)
            return `Gifted ${event.amount} subscription${event.amount !== 1 ? "s" : ""}`
        if (event.subKind === "resub" && event.cumulativeMonths != null)
            return `${event.cumulativeMonths} months`
        return event.tier ? (TWITCH_TIER_LABEL[event.tier] ?? null) : null
    }
    if (event.type === "bits" || event.type === "raid")
        return formatAmount(event.type, event.amount, null)
    if (event.type === "superchat")
        return formatAmount("superchat", event.amount, event.currency)
    if (event.type === "member") {
        if (event.levelName) return event.levelName
        if (event.amount != null) return `${event.amount} month${event.amount !== 1 ? "s" : ""}`
    }
    return null
}
