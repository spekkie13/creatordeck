import { NextRequest, NextResponse } from "next/server"

import { hasPro } from "@/lib/require-pro"
import { requireSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"
import { AnalyticsRangeSchema } from "@/lib/schemas/analytics.schema"
import { ONE_DAY_MS } from "@/constants/analytics"

import { analyticsService } from "@/services"
import type { AnalyticsOverview } from "@/services/analytics.types"
import {SessionResult} from "@/types/session";

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const

export async function GET(req: NextRequest) {
  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { searchParams } = new URL(req.url)
  const rangeResult = AnalyticsRangeSchema.safeParse(searchParams.get("range") ?? "7d")
  if (!rangeResult.success) return apiError(400, 'Invalid range')

  let range = rangeResult.data

  // Enforce the Free history cap server-side regardless of what the client sends.
  // Extended analytics history is a Pro feature (spec §2 — analytics inherits Pro).
  if ((range === "30d" || range === "90d") && !(await hasPro(session.userId))) range = "7d"

  const since = new Date(Date.now() - RANGES[range] * ONE_DAY_MS)

  const data: AnalyticsOverview = await analyticsService.getOverview(
    session.twitchId ?? "",
    session.youtubeChannelId ?? null,
    since,
  )

  return NextResponse.json(data)
}
