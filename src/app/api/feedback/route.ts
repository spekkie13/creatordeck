import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"
import { CreateFeedbackSchema } from "@/lib/schemas/feedback.schema"

import { feedbackRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const result = CreateFeedbackSchema.safeParse(await req.json())
  if (!result.success) return apiError(400, result.error.issues[0].message)

  await feedbackRepository.insert(session.userId, result.data.message.trim())
  return NextResponse.json({ ok: true })
}