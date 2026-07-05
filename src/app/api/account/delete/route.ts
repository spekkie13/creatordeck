import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"

import { accountService } from "@/services"

export async function POST() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  await accountService.deleteAccount(session.userId)

  return new Response(null, { status: 204 })
}
