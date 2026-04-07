import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { liveEventFeedService } from "@/services"

const POLL_INTERVAL_MS = 3000
const INITIAL_LOOKBACK_MS = 5 * 60 * 1000 // send last 5 minutes on connect

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
