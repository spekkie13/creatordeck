import type { ChatItem, MessageItem } from "youtube-chat/dist/types/data"

import type { InsertYtMemberEvent, InsertYtSuperChatEvent } from "@/types/entities"
import { chatMessages } from "@/lib/schema"

type InsertChatMessage = typeof chatMessages.$inferInsert

export type ChatSseEvent = {
  type: "chat"
  id: string
  userDisplayName: string
  userId: string | null
  message: string
  occurredAt: string
}

export type SuperChatSseEvent = {
  type: "superchat"
  id: string
  userDisplayName: string
  userId: string | null
  message: string
  amount: string
  currency: string
  occurredAt: string
}

export type MemberSseEvent = {
  type: "member"
  id: string
  userDisplayName: string
  userId: string | null
  levelName: string | null
  memberMonths: number
  occurredAt: string
}

export type ErrorSseEvent = {
  type: "error"
  reason: "not_live" | "stopped"
  detail?: string
}

export type YouTubeSseEvent =
  | ChatSseEvent
  | SuperChatSseEvent
  | MemberSseEvent
  | ErrorSseEvent

function flattenMessage(parts: MessageItem[]): string {
  return parts.map(p => ("text" in p ? p.text : p.emojiText)).join("")
}

export function toChatMessageInsert(item: ChatItem, channelId: string): InsertChatMessage {
  return {
    platform: "youtube",
    channelId,
    eventId: item.id,
    userId: item.author.channelId,
    userDisplayName: item.author.name,
    message: flattenMessage(item.message),
    occurredAt: item.timestamp,
  }
}

export function toChatSsePayload(item: ChatItem): ChatSseEvent {
  return {
    type: "chat",
    id: item.id,
    userDisplayName: item.author.name,
    userId: item.author.channelId,
    message: flattenMessage(item.message),
    occurredAt: item.timestamp.toISOString(),
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  "$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₩": "KRW",
  "R$": "BRL",
  "A$": "AUD",
  "C$": "CAD",
  "HK$": "HKD",
  "NZ$": "NZD",
  "NT$": "TWD",
  "MX$": "MXN",
  "CHF": "CHF",
}

// Best-effort parse of strings like "$5.00", "€5,00", "A$10.00" — youtube-chat
// does not expose structured currency data, only the display string.
function parseSuperchatAmount(raw: string): { amountMicros: number; currency: string } {
  const trimmed = raw.trim()
  const symbolMatch = trimmed.match(/^([A-Z]{1,3}\$|[A-Z]{3}|[^\d\s.,]+)/)
  const symbol = symbolMatch ? symbolMatch[1] : ""
  const currency = CURRENCY_SYMBOLS[symbol] ?? "USD"

  const numStr = trimmed.slice(symbol.length).replace(/\s/g, "")
  let normalized = numStr
  if (numStr.includes(".") && numStr.includes(",")) {
    normalized = numStr.lastIndexOf(",") > numStr.lastIndexOf(".")
      ? numStr.replace(/\./g, "").replace(",", ".")
      : numStr.replace(/,/g, "")
  } else if (numStr.includes(",") && !numStr.includes(".")) {
    normalized = numStr.replace(",", ".")
  }

  const amount = Number(normalized)
  const amountMicros = Number.isFinite(amount) ? Math.round(amount * 1_000_000) : 0
  return { amountMicros, currency }
}

export function toSuperChatInsert(
  item: ChatItem,
  channelId: string,
): InsertYtSuperChatEvent | null {
  if (!item.superchat) return null
  const { amountMicros, currency } = parseSuperchatAmount(item.superchat.amount)
  const message = flattenMessage(item.message)
  return {
    channelId,
    eventId: item.id,
    userId: item.author.channelId,
    userDisplayName: item.author.name,
    amountMicros,
    currency,
    message: message || null,
    occurredAt: item.timestamp,
  }
}

export function toSuperChatSsePayload(item: ChatItem): SuperChatSseEvent | null {
  if (!item.superchat) return null
  const { amountMicros, currency } = parseSuperchatAmount(item.superchat.amount)
  return {
    type: "superchat",
    id: item.id,
    userDisplayName: item.author.name,
    userId: item.author.channelId,
    message: flattenMessage(item.message),
    amount: (amountMicros / 1_000_000).toFixed(2),
    currency,
    occurredAt: item.timestamp.toISOString(),
  }
}

// Best-effort parse of badge labels like "Member (2 months)", "Member (3 years)",
// "New member", or channel-custom tier names like "Super Fan (1 year)".
function parseMembershipBadge(
  label: string | undefined,
): { levelName: string | null; memberMonths: number } {
  if (!label) return { levelName: null, memberMonths: 0 }

  const match = label.match(/^(.*?)\s*\((\d+)\s+(month|year)s?\)\s*$/i)
  if (match) {
    const [, name, nStr, unit] = match
    const n = parseInt(nStr, 10)
    const months = unit.toLowerCase().startsWith("year") ? n * 12 : n
    return {
      levelName: name.trim() || null,
      memberMonths: months,
    }
  }

  return { levelName: label.trim() || null, memberMonths: 0 }
}

export function toMemberEventInsert(
  item: ChatItem,
  channelId: string,
): InsertYtMemberEvent | null {
  if (!item.isMembership) return null
  const { levelName, memberMonths } = parseMembershipBadge(item.author.badge?.label)
  return {
    channelId,
    eventId: item.id,
    userId: item.author.channelId,
    userDisplayName: item.author.name,
    memberMonths,
    levelName,
    occurredAt: item.timestamp,
  }
}

export function toMemberSsePayload(item: ChatItem): MemberSseEvent | null {
  if (!item.isMembership) return null
  const { levelName, memberMonths } = parseMembershipBadge(item.author.badge?.label)
  return {
    type: "member",
    id: item.id,
    userDisplayName: item.author.name,
    userId: item.author.channelId,
    levelName,
    memberMonths,
    occurredAt: item.timestamp.toISOString(),
  }
}