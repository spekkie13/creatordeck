import { NextRequest, NextResponse } from "next/server"

import { TWITCH_CHAT_POLL_MS, SSE_INITIAL_LOOKBACK_MS } from "@/constants/chat_api"
import { requireTwitchSession } from "@/lib/session-auth"

import { chatMessagesRepository } from "@/repositories"
import {TwitchSessionResult} from "@/types/session";

export async function GET(req: NextRequest) {
  const result: TwitchSessionResult = await requireTwitchSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const broadcasterId: string = session.twitchId

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      let lastSent: Date = new Date(Date.now() - SSE_INITIAL_LOOKBACK_MS)

      const poll = async () => {
        try {
          const messages = await chatMessagesRepository.getSince(broadcasterId, lastSent)
          if (messages.length > 0) {
            lastSent = new Date()
            // Return oldest-first so the UI can append in order
            controller.enqueue(encode([...messages].reverse()))
          }
        } catch (err) {
          console.error(`[chat/stream] SSE poll error (broadcaster=${broadcasterId}):`, err)
        }
      }

      await poll()
      const interval = setInterval(poll, TWITCH_CHAT_POLL_MS)

      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
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
