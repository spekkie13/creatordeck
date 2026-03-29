import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { subGoalsRepository } from "@/repositories"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const row = await subGoalsRepository.findByBroadcasterId(session.twitchId)
  return NextResponse.json({ goal: row?.goal ?? 100, initialCount: row?.initialCount ?? 0, endsAt: row?.endsAt?.toISOString() ?? null })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { goal, initialCount, endsAt } = await req.json()
  if (typeof goal !== "number" || goal < 1) return NextResponse.json({ error: "Invalid goal" }, { status: 400 })
  const safeInitialCount = typeof initialCount === "number" && initialCount >= 0 ? Math.floor(initialCount) : 0

  const endsAtDate = endsAt ? new Date(endsAt) : null

  await subGoalsRepository.upsert(session.twitchId, goal, safeInitialCount, endsAtDate)
  return NextResponse.json({ goal, initialCount: safeInitialCount, endsAt: endsAtDate?.toISOString() ?? null })
}
