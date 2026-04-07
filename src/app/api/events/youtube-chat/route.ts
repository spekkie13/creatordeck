import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

import { YOUTUBE_CHAT_POLL_MS, SSE_INITIAL_LOOKBACK_MS } from "@/constants/chat_api"

import { youtubeService } from "@/services"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.youtubeChannelId) {
    return apiError(401, 'Unauthorized')
  }

  const channelId = session.youtubeChannelId

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      let lastSent = new Date(Date.now() - SSE_INITIAL_LOOKBACK_MS)

      const poll = async () => {
        try {
          const messages = await youtubeService.getChatMessagesSince(channelId, lastSent)
          if (messages.length > 0) {
            lastSent = new Date()
            controller.enqueue(encode(messages))
          }
        } catch (err) {
          console.error(`[events/youtube-chat] SSE poll error (channel=${channelId}):`, err)
        }
      }

      await poll()
      const interval = setInterval(poll, YOUTUBE_CHAT_POLL_MS)

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
