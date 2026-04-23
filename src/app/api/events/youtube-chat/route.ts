import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { LiveChat } from "youtube-chat"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"
import { chatMessagesRepository, ytMemberEventsRepository, ytSuperChatEventsRepository } from "@/repositories"
import {
  toChatMessageInsert,
  toChatSsePayload,
  toSuperChatInsert,
  toSuperChatSsePayload,
  toMemberEventInsert,
  toMemberSsePayload,
  type YouTubeSseEvent,
} from "@/lib/youtube-chat-mapper"

export const runtime = "nodejs"
export const maxDuration = 800

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.youtubeChannelId) {
    return apiError(401, "Unauthorized")
  }

  const channelId = session.youtubeChannelId

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()

      const emit = (event: YouTubeSseEvent, occurredAt: Date) => {
        const frame =
          `id: ${occurredAt.toISOString()}\ndata: ${JSON.stringify(event)}\n\n`
        controller.enqueue(enc.encode(frame))
      }

      const emitAndClose = (event: YouTubeSseEvent) => {
        controller.enqueue(
          enc.encode(`data: ${JSON.stringify(event)}\n\n`),
        )
        controller.close()
      }

      // Tell the browser to reconnect after 3 s on drop
      controller.enqueue(enc.encode("retry: 3000\n\n"))

      // Catch-up: replay messages missed during a disconnect
      const lastEventId = req.headers.get("last-event-id")
      if (lastEventId) {
        const since = new Date(lastEventId)
        if (!isNaN(since.getTime())) {
          const missed = await chatMessagesRepository.getSince(channelId, since)
          for (const row of missed.reverse()) {
            emit(
              {
                type: "chat",
                id: row.eventId,
                userDisplayName: row.userDisplayName ?? "Unknown",
                userId: row.userId ?? null,
                message: row.message,
                occurredAt: row.occurredAt.toISOString(),
              },
              row.occurredAt,
            )
          }
        }
      }

      const liveChat = new LiveChat({ channelId })

      liveChat.on("chat", async (item) => {
        const occurredAt = item.timestamp

        // Plain chat message
        if (!item.isMembership && !item.superchat) {
          void chatMessagesRepository.insert(toChatMessageInsert(item, channelId))
          emit(toChatSsePayload(item), occurredAt)
          return
        }

        // Superchat
        if (item.superchat) {
          const insert = toSuperChatInsert(item, channelId)
          if (insert) void ytSuperChatEventsRepository.insert(insert)
          const payload = toSuperChatSsePayload(item)
          if (payload) emit(payload, occurredAt)
          return
        }

        // Membership
        if (item.isMembership) {
          const insert = toMemberEventInsert(item, channelId)
          if (insert) void ytMemberEventsRepository.insert(insert)
          const payload = toMemberSsePayload(item)
          if (payload) emit(payload, occurredAt)
        }
      })

      liveChat.on("end", (reason) => {
        emitAndClose({ type: "error", reason: "stopped", detail: reason ?? "stream ended" })
      })

      liveChat.on("error", (err) => {
        const detail = err instanceof Error ? err.message : String(err)
        emitAndClose({ type: "error", reason: "stopped", detail })
      })

      const started = await liveChat.start()
      if (!started) {
        emitAndClose({ type: "error", reason: "not_live" })
        return
      }

      req.signal.addEventListener("abort", () => {
        liveChat.stop("client disconnected")
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}