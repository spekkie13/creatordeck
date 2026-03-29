import { NextResponse } from "next/server"
import {getServerSession, Session} from "next-auth"
import { authOptions } from "@/lib/auth"
import { userRepository } from "@/repositories"
import type { User } from "@/types/entities"

export async function GET(): Promise<NextResponse<{error: string }> | NextResponse<{token: string}>> {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user: User | null = await userRepository.findById(session.userId)
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Generate on first request
  if (!user.widgetToken) {
    const token: string = crypto.randomUUID()
    await userRepository.setWidgetToken(session.userId, token)
    return NextResponse.json({ token })
  }

  return NextResponse.json({ token: user.widgetToken })
}

export async function POST(): Promise<NextResponse<{error: string}> | NextResponse<{token: string}>> {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token: string = crypto.randomUUID()
  await userRepository.setWidgetToken(session.userId, token)
  return NextResponse.json({ token })
}
