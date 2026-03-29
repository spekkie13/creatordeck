import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { liveEventFeedService } from "@/services"
import type { LiveEventType } from "@/types/events"
import type { EventSortBy, SortOrder } from "@/types/event-filter"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const params = req.nextUrl.searchParams

  const types = params.get("types")?.split(",").filter(Boolean) as LiveEventType[] | undefined
  const from = params.get("from") ? new Date(params.get("from")!) : undefined
  const to = params.get("to") ? new Date(params.get("to")!) : undefined
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

  return NextResponse.json(result)
}
