import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"
import { CreateGoalSchema } from "@/lib/schemas/goals.schema"

import { goalsRepository } from "@/repositories/goals.repository"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = CreateGoalSchema.safeParse(await req.json())
  if (!result.success) return apiError(400, result.error.issues[0].message)

  const { type, goal, endsAt } = result.data
  const endsAtDate = endsAt ? new Date(endsAt) : null
  await goalsRepository.upsert(session.userId, type, Math.floor(goal), endsAtDate)
  return NextResponse.json({ type, goal: Math.floor(goal), endsAt: endsAtDate?.toISOString() ?? null })
}
