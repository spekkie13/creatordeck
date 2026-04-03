import { NextRequest } from "next/server"
import { getServerSession, Session } from "next-auth"

import { INITIAL_LOOKBACK_MS, POLL_INTERVAL_MS } from "@/constants/chat_api"
import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

import { chatMessagesRepository } from "@/repositories"

export async function GET(req: NextRequest) {
  const session: Session | null = await getServerSession(authOptions)
  if (!session?.twitchId) return apiError(401, 'Unauthorized')

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
