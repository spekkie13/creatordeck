export type LiveEventType = "sub" | "follow" | "bits" | "raid" | "superchat" | "member"

export type LiveEvent = {
  id: string
  type: LiveEventType
  platform: "twitch" | "youtube"
  fromUser: string
  amount: number | null
  currency?: string | null        // superchat only — ISO 4217 code e.g. "USD"
  occurredAt: string
  // Detail fields — only present for types that carry them
  message?: string | null         // sub, bits, superchat
  tier?: string | null            // sub — "1000" | "2000" | "3000"
  subKind?: string | null         // sub — "new" | "resub" | "community_gift"
  cumulativeMonths?: number | null // sub resub
  isAnonymous?: boolean           // bits
  levelName?: string | null       // member
  isReplay?: boolean              // re-rolled from history
}