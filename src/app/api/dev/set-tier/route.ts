import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import type { SubscriptionTier } from "@/lib/gates"
import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { requireSession } from "@/lib/session-auth"

import { userRepository } from "@/repositories"

const VALID_TIERS: SubscriptionTier[] = ["free", "tier1", "tier2", "tier3"]

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { tier } = await req.json()
  if (!VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
  }

  await db.update(users).set({ tier }).where(eq(users.id, session.userId))

  return NextResponse.json({ ok: true, tier })
}