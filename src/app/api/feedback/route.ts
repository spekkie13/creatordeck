import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { feedbackRepository } from "@/repositories"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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