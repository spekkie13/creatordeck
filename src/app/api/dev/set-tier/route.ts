import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { userRepository } from "@/repositories"
import { db } from "@/lib/db"
import { users } from "@/lib/schema"
import { eq } from "drizzle-orm"
import type { SubscriptionTier } from "@/lib/gates"

const VALID_TIERS: SubscriptionTier[] = ["free", "tier1", "tier2", "tier3"]

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { tier } = await req.json()
  if (!VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
  }

  await db.update(users).set({ tier }).where(eq(users.id, session.userId))

  return NextResponse.json({ ok: true, tier })
}