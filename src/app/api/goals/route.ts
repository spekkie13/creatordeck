import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { goalsRepository } from "@/repositories/goals.repository"
import type { GoalType } from "@/repositories/goals.repository"

const VALID_TYPES: GoalType[] = ["twitch_follow", "youtube_member"]

export async function POST(req: NextRequest) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { type, goal, endsAt } = await req.json()
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  if (typeof goal !== "number" || goal < 1) return NextResponse.json({ error: "Invalid goal" }, { status: 400 })

  const endsAtDate = endsAt ? new Date(endsAt) : null
  await goalsRepository.upsert(session.userId, type, Math.floor(goal), endsAtDate)
  return NextResponse.json({ type, goal: Math.floor(goal), endsAt: endsAtDate?.toISOString() ?? null })
}
