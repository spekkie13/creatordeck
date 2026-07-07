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
 * and no broadcast is live. Uses `liveBroadcasts.list` (never `search.list`) and
 * opens/closes the ingestion session as liveness changes.
 */
export async function GET(request: Request) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  // Interim Pro gate — owner-only until billing ships requirePro.
  if (!hasYouTubeAccess(session)) return apiError(403, "Forbidden")

  const channelId = session.youtubeChannelId
  if (!channelId) return apiError(400, "YouTube not connected")

  const accessToken = await youtubeService.getValidAccessToken(session.userId)
  if (!accessToken) return apiSuccess({ live: false, status: "reconnect_required" })

  // Owner-only diagnostic (`?debug=1`): probe several candidate liveBroadcasts.list
  // queries and report which one surfaces the live broadcast + its liveChatId, so
  // one live prod call pins the correct parameter combo. Observational — no
  // session mutation.
  const debug = new URL(request.url).searchParams.get("debug") === "1"
  if (debug) {
    const probes = await youtubeService.probeBroadcastDetection(accessToken)
    return apiSuccess({ debug: true, channelId, probes })
  }

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
