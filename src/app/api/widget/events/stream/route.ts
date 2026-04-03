import { NextRequest } from "next/server"

import type { LiveEvent } from "@/types/events"

import { apiError } from "@/lib/api-response"

import { userRepository, linkedAccountsRepository, eventReplaysRepository } from "@/repositories"

import { liveEventFeedService } from "@/services"

const POLL_INTERVAL_MS = 3000

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  if (!token) return apiError(400, 'Missing token')

  const user = await userRepository.findByWidgetToken(token)
  if (!user) return apiError(401, 'Invalid token')

  const linkedAccounts = await linkedAccountsRepository.findByUserId(user.id)
  const twitchAccount = linkedAccounts.find(a => a.provider === "twitch")
  const ytAccount = linkedAccounts.find(a => a.provider === "youtube")
  const broadcasterId = twitchAccount?.providerAccountId ?? ""
  const youtubeChannelId = ytAccount?.providerAccountId ?? null

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      // Start from now — don't flood with historical events on connect
      let lastSent = new Date()

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

          const all = [...replayEvents, ...newEvents]
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
