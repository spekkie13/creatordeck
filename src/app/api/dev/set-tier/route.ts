import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { requireSession } from "@/lib/session-auth"
import {SessionResult} from "@/types/session";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse)
    return result
  const { session } = result

  const { tier } = await req.json()

  await db.update(users).set({ tier }).where(eq(users.id, session.userId))

  return NextResponse.json({ ok: true, tier })
}
