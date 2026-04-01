import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { analyticsService } from "@/services"
import type { SessionDetail } from "@/services/analytics.types"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  if (!session.twitchId) return NextResponse.json({ error: "Twitch account required" }, { status: 400 })

  const data: SessionDetail | null = await analyticsService.getSessionDetail(sessionId, session.twitchId)
  if (!data) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  return NextResponse.json(data)
}
