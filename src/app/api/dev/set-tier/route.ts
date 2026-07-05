import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { requireSession } from "@/lib/session-auth"
import {SessionResult} from "@/types/session";

// Dev-only. In Phase 0, Pro access == owner (`isAdmin`), so this toggles that
// flag to simulate Free vs Pro. Phase 1 adds richer entitlement/trial controls.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse)
    return result
  const { session } = result

  const { isAdmin } = await req.json()

  await db.update(users).set({ isAdmin: !!isAdmin }).where(eq(users.id, session.userId))

  return NextResponse.json({ ok: true, isAdmin: !!isAdmin })
}
