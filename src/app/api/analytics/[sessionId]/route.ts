import { NextRequest, NextResponse } from "next/server"
import {getServerSession, Session} from "next-auth"
import { authOptions } from "@/lib/auth"
import { analyticsService } from "@/services"
import {SessionDetail} from "@/services/analytics.types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!session.twitchId) return NextResponse.json({ error: "Twitch account required" }, { status: 400 })

  const data: SessionDetail | null = await analyticsService.getSessionDetail(params.sessionId, session.twitchId)
  if (!data) return NextResponse.json({ error: "Session not found" }, { status: 404 })

  return NextResponse.json(data)
}
