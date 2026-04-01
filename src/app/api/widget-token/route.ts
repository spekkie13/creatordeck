import { NextResponse } from "next/server"

import type { User } from "@/types/entities"

import { requireSession } from "@/lib/session-auth"

import { userRepository } from "@/repositories"
import {SessionResult} from "@/types/session";

export async function GET(): Promise<NextResponse<{error: string }> | NextResponse<{token: string}> | NextResponse> {
  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const user: User | null = await userRepository.findById(session.userId)
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!user.widgetToken) {
    const token: string = crypto.randomUUID()
    await userRepository.setWidgetToken(session.userId, token)
    return NextResponse.json({ token })
  }

  return NextResponse.json({ token: user.widgetToken })
}

export async function POST(): Promise<NextResponse<{error: string}> | NextResponse<{token: string}>| NextResponse> {
  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const token: string = crypto.randomUUID()
  await userRepository.setWidgetToken(session.userId, token)
  return NextResponse.json({ token })
}
