import { NextRequest, NextResponse } from "next/server"

import { requireTwitchSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"
import { CreateSubGoalSchema } from "@/lib/schemas/goals.schema"

import { subGoalsRepository } from "@/repositories"

export async function GET() {
  const result = await requireTwitchSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const row = await subGoalsRepository.findByBroadcasterId(session.twitchId)
  return NextResponse.json({ goal: row?.goal ?? 100, initialCount: row?.initialCount ?? 0, endsAt: row?.endsAt?.toISOString() ?? null })
}

export async function POST(req: NextRequest) {
  const result = await requireTwitchSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const parsed = CreateSubGoalSchema.safeParse(await req.json())
  if (!parsed.success) return apiError(400, parsed.error.issues[0].message)

  const { goal, initialCount, endsAt } = parsed.data
  const safeInitialCount = initialCount ?? 0
  const endsAtDate = endsAt ? new Date(endsAt) : null

  await subGoalsRepository.upsert(session.twitchId, goal, safeInitialCount, endsAtDate)
  return NextResponse.json({ goal, initialCount: safeInitialCount, endsAt: endsAtDate?.toISOString() ?? null })
}
