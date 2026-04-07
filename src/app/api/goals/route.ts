import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"
import { CreateGoalSchema } from "@/lib/schemas/goals.schema"

import { goalsRepository } from "@/repositories/goals.repository"

export async function POST(req: NextRequest) {
  const authResult = await requireSession()
  if (authResult instanceof NextResponse) return authResult
  const { session } = authResult

  const parsed = CreateGoalSchema.safeParse(await req.json())
  if (!parsed.success) return apiError(400, parsed.error.issues[0].message)

  const { type, goal, endsAt } = parsed.data
  const endsAtDate = endsAt ? new Date(endsAt) : null
  await goalsRepository.upsert(session.userId, type, Math.floor(goal), endsAtDate)
  return NextResponse.json({ type, goal: Math.floor(goal), endsAt: endsAtDate?.toISOString() ?? null })
}
