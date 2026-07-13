import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { requirePro } from "@/lib/require-pro"

import { youtubeService } from "@/services"
import { ytStreamSessionsRepository } from "@/repositories"

export const runtime = "nodejs"

/**
 * Broadcast detection (spec §3.6). Infrequent by design — called on live-view
 * mount, on a manual check, and on a slow background timer while a tab is open
 * and no broadcast is live. Uses ONLY `liveBroadcasts.list mine=true`; never
 * `search.list`. Opens/closes the ingestion session as liveness changes.
 */
export async function GET() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  // YouTube is a Pro feature (spec §3.4).
  const gate = await requirePro(session.userId)
  if (gate) return gate

  const channelId = session.youtubeChannelId
  if (!channelId) return apiError(400, "YouTube not connected")

  const accessToken = await youtubeService.getValidAccessToken(session.userId)
  if (!accessToken) return apiSuccess({ live: false, status: "reconnect_required" })

  const broadcast = await youtubeService.getActiveBroadcast(accessToken)
  if (!broadcast) {
    await ytStreamSessionsRepository.close(channelId)
    return apiSuccess({ live: false })
  }

  await ytStreamSessionsRepository.open({
    channelId,
    broadcastId: broadcast.id,
    title: broadcast.title,
    liveChatId: broadcast.liveChatId,
  })
  return apiSuccess({ live: true })
}
