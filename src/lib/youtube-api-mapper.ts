import type { InsertYtSuperChatEvent } from "@/types/entities"
import type { ChatMessage } from "@/types/chat"
import { PLATFORM_YOUTUBE } from "@/types/platform"

/**
 * Shape of a `liveChatMessages.list` item (part=snippet,authorDetails). Unlike
 * the removed InnerTube scraper, the official API returns structured monetization
 * data — `amountMicros` (int64 as string) + ISO `currency` — so no symbol/badge
 * string-parsing is needed. Only the fields we consume are typed.
 */
export type YouTubeLiveChatItem = {
  id: string
  snippet: {
    type:
      | "textMessageEvent"
      | "superChatEvent"
      | "superStickerEvent"
      | "newSponsorEvent"
      | "memberMilestoneChatEvent"
      | string
    publishedAt: string
    displayMessage?: string
    textMessageDetails?: { messageText?: string }
    superChatDetails?: {
      amountMicros?: string | number
      currency?: string
      userComment?: string
    }
    superStickerDetails?: {
      amountMicros?: string | number
      currency?: string
      superStickerMetadata?: { altText?: string }
    }
  }
  authorDetails: {
    channelId?: string
    displayName?: string
  }
}

function amountToMicros(raw: string | number | undefined): number {
  if (raw === undefined) return 0
  const n = typeof raw === "number" ? raw : parseInt(raw, 10)
  return Number.isFinite(n) ? n : 0
}

/** Client-facing chat payload for a `textMessageEvent`. */
export function toChatPayload(item: YouTubeLiveChatItem): ChatMessage | null {
  if (item.snippet.type !== "textMessageEvent") return null
  return {
    id: item.id,
    platform: PLATFORM_YOUTUBE,
    userDisplayName: item.authorDetails.displayName ?? "Unknown",
    message: item.snippet.textMessageDetails?.messageText ?? item.snippet.displayMessage ?? "",
    occurredAt: new Date(item.snippet.publishedAt).toISOString(),
  }
}

/**
 * Super Chat / Super Sticker → `yt_superchat_events` row (structured amount +
 * currency). Super Stickers are stored as superchat rows with the sticker alt
 * text as the message. Membership events are intentionally NOT parsed in v1
 * (spec §2).
 */
export function toSuperChatInsert(
  item: YouTubeLiveChatItem,
  channelId: string,
): InsertYtSuperChatEvent | null {
  const { type } = item.snippet
  if (type === "superChatEvent") {
    const d = item.snippet.superChatDetails
    if (!d) return null
    return {
      channelId,
      eventId: item.id,
      userId: item.authorDetails.channelId ?? null,
      userDisplayName: item.authorDetails.displayName ?? "Unknown",
      amountMicros: amountToMicros(d.amountMicros),
      currency: d.currency ?? "USD",
      message: d.userComment || null,
      occurredAt: new Date(item.snippet.publishedAt),
    }
  }
  if (type === "superStickerEvent") {
    const d = item.snippet.superStickerDetails
    if (!d) return null
    return {
      channelId,
      eventId: item.id,
      userId: item.authorDetails.channelId ?? null,
      userDisplayName: item.authorDetails.displayName ?? "Unknown",
      amountMicros: amountToMicros(d.amountMicros),
      currency: d.currency ?? "USD",
      message: d.superStickerMetadata?.altText || null,
      occurredAt: new Date(item.snippet.publishedAt),
    }
  }
  return null
}
