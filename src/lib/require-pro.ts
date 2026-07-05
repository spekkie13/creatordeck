import { NextResponse } from "next/server"

import { userRepository } from "@/repositories"

/**
 * The single Pro entitlement predicate (spec §3.2). Every paid gate in the
 * codebase — server routes, the YouTube gate, the analytics history cap, the
 * (future) automation/OBS-write executor — must resolve access through `hasPro`
 * or `requirePro`, never through a scattered plan/tier check. Grep-ability is an
 * acceptance criterion.
 *
 * Reads from the DB, NOT the session: `isAdmin`/plan are baked into the JWT at
 * login and only refresh on `session.update()` (src/lib/auth.ts), so the session
 * is a stale cache. Paid enforcement must consult the source of truth.
 *
 * PHASE 0 STUB: Pro access == owner (`users.isAdmin`). Phase 1 replaces the body
 * with the DB-backed entitlement check (`hasProFromEntitlement`: trial / active /
 * canceled_active / past_due-grace) while keeping this exact signature, so no
 * call site changes.
 */
export async function hasPro(userId: string): Promise<boolean> {
  const user = await userRepository.findById(userId)
  return !!user?.isAdmin
}

/** Route guard: returns a 403 NextResponse if the user is not Pro, else null. */
export async function requirePro(userId: string): Promise<NextResponse | null> {
  if (await hasPro(userId)) return null
  return NextResponse.json({ error: "Pro required" }, { status: 403 })
}
