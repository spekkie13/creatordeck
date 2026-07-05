import type { Plan } from "@/types/plan"

export type { BillingCycle } from "@/types/plan"

// Free vs Pro feature matrix (spec §2). Keep in sync with the pricing page.
export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "Twitch chat, follows, subs, bits & raids",
    "Live event feed + follower/sub counts",
    "Spotify song requests via chat",
    "Goals tracking",
    "Single config profile",
    "30-day event history",
    "Read-only OBS/desktop app",
  ],
  pro: [
    "Everything in Free",
    "YouTube connection — unified chat, Super Chats & Stickers",
    "Advanced automation: conditional logic + multi-action macros",
    "OBS control: scene switching, source toggles & volume",
    "Unlimited event history",
    "Multiple profiles/presets",
  ],
}
