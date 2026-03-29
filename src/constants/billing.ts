import type {SubscriptionTier} from "@/lib/gates";

export type BillingCycle = "monthly" | "annual"
export type PaidTier = "tier1" | "tier2" | "tier3"
export const PAID_TIERS: PaidTier[] = ["tier1", "tier2", "tier3"]

export const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
    free: [
        "Unified live dashboard (Twitch + YouTube)",
        "Real-time event feed",
        "Basic OBS overlays",
        "Goals tracking",
        "7-day event history",
    ],
    tier1: [
        "Everything in Free",
        "Full analytics history (30d / 90d)",
        "Per-session breakdowns",
        "Platform comparison charts",
    ],
    tier2: [
        "Everything in Tier 1",
        "Custom alert overlays for OBS",
        "Stream info management (title, game)",
        "Cross-platform goals",
        "Simultaneous go-live on Twitch + YouTube",
    ],
    tier3: [
        "Everything in Tier 2",
        "AI stream analysis",
        "VOD transcription insights",
        "Weekly improvement reports",
        "Retention coaching",
    ],
}
