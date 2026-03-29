import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { goalsRepository, type GoalType } from "@/repositories/goals.repository"

const VALID_TYPES: GoalType[] = ["twitch_follow", "youtube_member"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { type, goal, endsAt } = await req.json()
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  if (typeof goal !== "number" || goal < 1) return NextResponse.json({ error: "Invalid goal" }, { status: 400 })

  const endsAtDate = endsAt ? new Date(endsAt) : null
  await goalsRepository.upsert(session.userId, type, Math.floor(goal), endsAtDate)
  return NextResponse.json({ type, goal: Math.floor(goal), endsAt: endsAtDate?.toISOString() ?? null })
}
