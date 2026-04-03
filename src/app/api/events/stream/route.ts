import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

import { liveEventFeedService } from "@/services"

const POLL_INTERVAL_MS = 3000
const INITIAL_LOOKBACK_MS = 5 * 60 * 1000 // send last 5 minutes on connect

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return apiError(401, 'Unauthorized')
  }

  const broadcasterId = session.twitchId ?? ""
  const youtubeChannelId = session.youtubeChannelId

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      let lastSent = new Date(Date.now() - INITIAL_LOOKBACK_MS)

      const poll = async () => {
        try {
          const events = await liveEventFeedService.getEventsSince(broadcasterId, lastSent, youtubeChannelId)
          if (events.length > 0) {
            lastSent = new Date()
            controller.enqueue(encode(events))
          }
        } catch (err) {
          console.error(`[events/stream] SSE poll error (broadcaster=${broadcasterId}, youtube=${youtubeChannelId ?? 'none'}):`, err)
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
