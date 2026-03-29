export type EventTypeKey = "follows" | "subs" | "bits" | "raids" | "superchats" | "members"
export type Range = "7d" | "30d" | "90d"
export type ChartTab = "activity" | "revenue"

export const RANGE_LABELS: Record<Range, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" }
export const GATED_RANGES: Range[] = ["30d", "90d"]
