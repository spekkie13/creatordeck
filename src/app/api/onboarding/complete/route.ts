import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { userRepository } from "@/repositories"

export async function POST() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result
  await userRepository.completeOnboarding(session.userId)
  return NextResponse.json({ ok: true })
}
