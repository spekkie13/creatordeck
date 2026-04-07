import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"
import { CreateFeedbackSchema } from "@/lib/schemas/feedback.schema"

import { feedbackRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const authResult = await requireSession()
  if (authResult instanceof NextResponse) return authResult
  const { session } = authResult

  const parsed = CreateFeedbackSchema.safeParse(await req.json())
  if (!parsed.success) return apiError(400, parsed.error.issues[0].message)

  await feedbackRepository.insert(session.userId, parsed.data.message.trim())
  return NextResponse.json({ ok: true })
}
