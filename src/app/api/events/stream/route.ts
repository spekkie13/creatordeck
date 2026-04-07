import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { EVENT_STREAM_POLL_MS, SSE_INITIAL_LOOKBACK_MS } from "@/constants/chat_api"

import { liveEventFeedService } from "@/services"

export async function GET(req: NextRequest) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const broadcasterId = session.twitchId ?? ""
  const youtubeChannelId = session.youtubeChannelId

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      let lastSent = new Date(Date.now() - SSE_INITIAL_LOOKBACK_MS)

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
      const interval = setInterval(poll, EVENT_STREAM_POLL_MS)

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
