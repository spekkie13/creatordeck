import { NextRequest, NextResponse } from "next/server"

import { hasAccess } from "@/lib/gates"
import { requireSession } from "@/lib/session-auth"

import { analyticsService } from "@/services"
import type { AnalyticsOverview } from "@/services/analytics.types"

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const
type Range = keyof typeof RANGES

export async function GET(req: NextRequest) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { searchParams } = new URL(req.url)
  let range: Range = (searchParams.get("range") ?? "7d") as Range

  // Enforce free-tier cap server-side regardless of what the client sends
  if (range === "30d" && !hasAccess(session.tier, "tier1")) range = "7d"
  if (range === "90d" && !hasAccess(session.tier, "tier1")) range = "7d"

  const days = RANGES[range] ?? 7
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const data: AnalyticsOverview = await analyticsService.getOverview(
    session.twitchId ?? "",
    session.youtubeChannelId ?? null,
    since,
  )

  return NextResponse.json(data)
}
