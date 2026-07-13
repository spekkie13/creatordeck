import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { requirePro } from "@/lib/require-pro"

import { youtubeService, YT_LIST_UNITS_ESTIMATE } from "@/services"
import {
  ytStreamSessionsRepository,
  ytSuperChatEventsRepository,
} from "@/repositories"
import {
  toChatPayload,
  toSuperChatInsert,
} from "@/lib/youtube-api-mapper"
import type { ChatMessage } from "@/types/chat"

export const runtime = "nodejs"

/**
 * Mode A chat ingestion (spec §3.1). One stateless `liveChatMessages.list` tick
 * per request: persist new messages + Super Chats, advance the session resume
 * token, and return the messages plus YouTube's demanded `pollingIntervalMillis`
 * (the client schedules the next tick from this — never a hardcoded interval).
 * Requires a confirmed-live broadcast (an open session) — otherwise returns
 * `not_live` so no chat call is made when nothing is live (AC4). Tokens never
 * appear in the response or logs.
 */
export async function GET() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  // YouTube is a Pro feature (spec §3.4).
  const gate = await requirePro(session.userId)
  if (gate) return gate

  const channelId = session.youtubeChannelId
  if (!channelId) return apiError(400, "YouTube not connected")

  const accessToken = await youtubeService.getValidAccessToken(session.userId)
  if (!accessToken) return apiSuccess({ status: "reconnect_required", messages: [] })

  const activeSession = await ytStreamSessionsRepository.findActive(channelId)
  if (!activeSession?.liveChatId) {
    return apiSuccess({ status: "not_live", messages: [] })
  }

  const fetched = await youtubeService.fetchLiveChatMessages(
    accessToken,
    activeSession.liveChatId,
    activeSession.chatPageToken,
  )

  if (!fetched.ok) {
    if (fetched.error === "quota") {
      return apiSuccess({ status: "quota", messages: [], retryAfterMillis: fetched.retryAfterMillis ?? 60_000 })
    }
    if (fetched.error === "ended") {
      await ytStreamSessionsRepository.close(channelId)
      return apiSuccess({ status: "ended", messages: [] })
    }
    return apiError(502, "YouTube chat fetch failed")
  }

  // Collect client payloads (and persist Super Chats). Text chat is delivered
  // live to the client only — it is deliberately NOT stored, since the live view
  // is client-held and nothing reads chat back from the DB. Super Chats/Stickers
  // are persisted to yt_superchat_events because the event feed is DB-driven.
  // The superchat insert is onConflictDoNothing, so tick overlap is harmless.
  const messages: ChatMessage[] = []
  for (const item of fetched.items) {
    const type = item.snippet.type
    if (type === "textMessageEvent") {
      const payload = toChatPayload(item)
      if (payload) messages.push(payload)
    } else if (type === "superChatEvent" || type === "superStickerEvent") {
      const insert = toSuperChatInsert(item, channelId)
      if (insert) await ytSuperChatEventsRepository.insert(insert)
    }
    // Other event types (memberships, milestones) are ignored in v1 (spec §2).
  }

  await ytStreamSessionsRepository.advance(activeSession.id, fetched.nextPageToken, YT_LIST_UNITS_ESTIMATE)

  return apiSuccess({
    status: "live",
    messages,
    pollingIntervalMillis: fetched.pollingIntervalMillis,
  })
}
