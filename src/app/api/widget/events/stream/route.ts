import { NextRequest, NextResponse } from "next/server"

import type { LiveEvent } from "@/types/events"

import { linkedAccountsRepository, eventReplaysRepository } from "@/repositories"
import { validateWidgetToken } from "@/lib/widget-auth"

import { liveEventFeedService } from "@/services"
import {PLATFORM_TWITCH, PLATFORM_YOUTUBE} from "@/types/platform";
import {WidgetAuthResult} from "@/types/session";

const POLL_INTERVAL_MS = 3000

export async function GET(req: NextRequest): Promise<Response> {
  const result: WidgetAuthResult = await validateWidgetToken(req)
  if (result instanceof NextResponse) return result
  const { user } = result

  const [twitchAccount, ytAccount] = await Promise.all([
    linkedAccountsRepository.findByUserIdAndProvider(user.id, PLATFORM_TWITCH),
    linkedAccountsRepository.findByUserIdAndProvider(user.id, PLATFORM_YOUTUBE),
  ])
  const broadcasterId: string = twitchAccount?.providerAccountId ?? ""
  const youtubeChannelId: string | null = ytAccount?.providerAccountId ?? null

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      // Start from now — don't flood with historical events on connect
      let lastSent: Date = new Date()

      const poll = async () => {
        try {
          const [newEvents, pendingReplays] = await Promise.all([
            liveEventFeedService.getEventsSince(broadcasterId, lastSent, youtubeChannelId),
            eventReplaysRepository.getPending(user.id),
          ])

          const replayEvents: LiveEvent[] = pendingReplays.map(r => ({
            ...(JSON.parse(r.eventData) as LiveEvent),
            isReplay: true,
          }))

          if (pendingReplays.length > 0) {
            await eventReplaysRepository.markProcessed(pendingReplays.map(r => r.id))
            eventReplaysRepository.cleanup().catch(() => {})
          }

          const all: LiveEvent[] = [...replayEvents, ...newEvents]
          if (all.length > 0) {
            lastSent = new Date()
            controller.enqueue(encode(all))
          }
        } catch (err) {
          console.error(`[widget/events/stream] SSE poll error (userId=${user.id}):`, err)
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
