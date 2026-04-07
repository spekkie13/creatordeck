import { NextRequest, NextResponse } from "next/server"

import { INITIAL_LOOKBACK_MS, POLL_INTERVAL_MS } from "@/constants/chat_api"
import { requireTwitchSession } from "@/lib/session-auth"

import { chatMessagesRepository } from "@/repositories"

export async function GET(req: NextRequest) {
  const result = await requireTwitchSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const broadcasterId: string = session.twitchId

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      let lastSent: Date = new Date(Date.now() - INITIAL_LOOKBACK_MS)

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
      const interval = setInterval(poll, POLL_INTERVAL_MS)

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
