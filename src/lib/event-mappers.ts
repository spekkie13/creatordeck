import type { LiveEvent } from "@/types/events"

import type { cheerEvents, followEvents, raidEvents, subEvents, ytMemberEvents, ytSuperChatEvents } from "@/lib/schema"

type SubRow        = typeof subEvents.$inferSelect
type FollowRow     = typeof followEvents.$inferSelect
type CheerRow      = typeof cheerEvents.$inferSelect
type RaidRow       = typeof raidEvents.$inferSelect
type SuperchatRow  = typeof ytSuperChatEvents.$inferSelect
type MemberRow     = typeof ytMemberEvents.$inferSelect

export function mapSubToEvent(e: SubRow): LiveEvent {
  return { id: e.id, type: "sub", platform: "twitch", fromUser: e.userDisplayName ?? e.gifterDisplayName ?? "Anonymous", amount: e.giftCount, occurredAt: e.occurredAt.toISOString(), tier: e.tier, subKind: e.kind, cumulativeMonths: e.cumulativeMonths ?? null, message: e.message ?? null }
}

export function mapFollowToEvent(e: FollowRow): LiveEvent {
  return { id: e.id, type: "follow", platform: "twitch", fromUser: e.userDisplayName ?? "Anonymous", amount: null, occurredAt: e.occurredAt.toISOString() }
}

export function mapCheerToEvent(e: CheerRow): LiveEvent {
  return { id: e.id, type: "bits", platform: "twitch", fromUser: e.isAnonymous ? "Anonymous" : (e.userDisplayName ?? "Anonymous"), amount: e.bits, occurredAt: e.occurredAt.toISOString(), message: e.message ?? null, isAnonymous: e.isAnonymous }
}

export function mapRaidToEvent(e: RaidRow): LiveEvent {
  return { id: e.id, type: "raid", platform: "twitch", fromUser: e.fromBroadcasterDisplayName, amount: e.viewerCount, occurredAt: e.occurredAt.toISOString() }
}

export function mapSuperchatToEvent(e: SuperchatRow): LiveEvent {
  return { id: e.id, type: "superchat", platform: "youtube", fromUser: e.userDisplayName ?? "Anonymous", amount: e.amountMicros / 1_000_000, currency: e.currency, occurredAt: e.occurredAt.toISOString(), message: e.message ?? null }
}

export function mapMemberToEvent(e: MemberRow): LiveEvent {
  return { id: e.id, type: "member", platform: "youtube", fromUser: e.userDisplayName ?? "Anonymous", amount: e.memberMonths, occurredAt: e.occurredAt.toISOString(), levelName: e.levelName ?? null }
}
