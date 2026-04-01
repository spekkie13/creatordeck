import { NextRequest, NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { feedbackRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { message } = await req.json()
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message required" }, { status: 400 })
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 })
  }

  await feedbackRepository.insert(session.userId, message.trim())
  return NextResponse.json({ ok: true })
}