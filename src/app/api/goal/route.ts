import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"
import { CreateSubGoalSchema } from "@/lib/schemas/goals.schema"

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

  const result = CreateSubGoalSchema.safeParse(await req.json())
  if (!result.success) return apiError(400, result.error.issues[0].message)

  const { goal, initialCount, endsAt } = result.data
  const safeInitialCount = initialCount ?? 0
  const endsAtDate = endsAt ? new Date(endsAt) : null

  await subGoalsRepository.upsert(session.twitchId, goal, safeInitialCount, endsAtDate)
  return NextResponse.json({ goal, initialCount: safeInitialCount, endsAt: endsAtDate?.toISOString() ?? null })
}
