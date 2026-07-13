import { NextRequest, NextResponse } from "next/server"

import type { LiveEventType } from "@/types/events"
import type { EventSortBy, SortOrder } from "@/types/event-filter"

import { requireTwitchSession } from "@/lib/session-auth"
import { hasPro } from "@/lib/require-pro"
import { FREE_HISTORY_DAYS } from "@/lib/entitlement"

import { liveEventFeedService } from "@/services"

export async function GET(req: NextRequest) {
  const twitchSession = await requireTwitchSession()
  if (twitchSession instanceof NextResponse) return twitchSession
  const { session } = twitchSession

  const params = req.nextUrl.searchParams

  const types = params.get("types")?.split(",").filter(Boolean) as LiveEventType[] | undefined
  let from = params.get("from") ? new Date(params.get("from")!) : undefined
  const to = params.get("to") ? new Date(params.get("to")!) : undefined

  // History older than FREE_HISTORY_DAYS is Pro (spec §3.4) — server-side clamp,
  // the UI date cap is UX only. A `to` older than the floor yields an empty window.
  let clamped = false
  if (!(await hasPro(session.userId))) {
    const floor = new Date(Date.now() - FREE_HISTORY_DAYS * 24 * 60 * 60 * 1000)
    if (!from || from < floor) {
      clamped = true
      from = floor
    }
  }
  const sortBy = (params.get("sortBy") ?? "occurredAt") as EventSortBy
  const sortOrder = (params.get("sortOrder") ?? "desc") as SortOrder
  const page = parseInt(params.get("page") ?? "1")
  const limit = parseInt(params.get("limit") ?? "25")

  const result = await liveEventFeedService.getFilteredEvents({
    broadcasterId: session.twitchId,
    youtubeChannelId: session.youtubeChannelId ?? undefined,
    types,
    from,
    to,
    sortBy,
    sortOrder,
    page,
    limit,
  })

  return NextResponse.json({ ...result, clamped })
}
