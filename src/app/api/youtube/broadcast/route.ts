import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError, apiSuccess } from "@/lib/api-response"
import { hasYouTubeAccess } from "@/lib/youtube-gate"

import { youtubeService, YT_BROADCAST_UNITS_ESTIMATE } from "@/services"
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

  // Interim Pro gate — owner-only until billing ships requirePro.
  if (!hasYouTubeAccess(session)) return apiError(403, "Forbidden")

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
  // Count this liveBroadcasts.list call toward the session's quota (spec §3.6).
  await ytStreamSessionsRepository.recordDetection(channelId, YT_BROADCAST_UNITS_ESTIMATE)
  return apiSuccess({ live: true })
}
