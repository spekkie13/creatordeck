import { NextRequest, NextResponse } from "next/server"

import type { LiveEventType } from "@/types/events"
import type { EventSortBy, SortOrder } from "@/types/event-filter"

import { requireTwitchSession } from "@/lib/session-auth"
import { hasPro } from "@/lib/require-pro"
import { FREE_HISTORY_MS } from "@/lib/entitlement"

import { liveEventFeedService } from "@/services"

/** Parse a date param; unparseable values become undefined (never Invalid Date). */
function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return isNaN(d.getTime()) ? undefined : d
}

export async function GET(req: NextRequest) {
  const twitchSession = await requireTwitchSession()
  if (twitchSession instanceof NextResponse) return twitchSession
  const { session } = twitchSession

  const params = req.nextUrl.searchParams

  const types = params.get("types")?.split(",").filter(Boolean) as LiveEventType[] | undefined
  let from = parseDate(params.get("from"))
  const to = parseDate(params.get("to"))

  // History older than FREE_HISTORY_DAYS is Pro (spec §3.4) — server-side clamp,
  // the UI date cap is UX only. A `to` older than the floor yields an empty window.
  // hasPro is only consulted when the requested window actually crosses the floor.
  let clamped = false
  const floor = new Date(Date.now() - FREE_HISTORY_MS)
  if ((!from || from < floor) && !(await hasPro(session.userId))) {
    clamped = true
    from = floor
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
