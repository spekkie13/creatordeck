import { NextRequest, NextResponse } from "next/server"
import { getServerSession, Session } from "next-auth"

import { hasAccess } from "@/lib/gates"
import { authOptions } from "@/lib/auth"

import { analyticsService } from "@/services"
import type { AnalyticsOverview } from "@/services/analytics.types"

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const
type Range = keyof typeof RANGES

export async function GET(req: NextRequest) {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
