import { NextResponse } from "next/server"

import { userRepository, entitlementRepository } from "@/repositories"
import { hasProFromEntitlement } from "@/lib/entitlement"

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
 * Pro == owner (`users.isAdmin`, also covers comped accounts) OR an entitlement
 * that grants Pro (trial / active / canceled_active / past_due-grace).
 */
export async function hasPro(userId: string): Promise<boolean> {
  const [user, ent] = await Promise.all([
    userRepository.findById(userId),
    entitlementRepository.getByUserId(userId),
  ])
  if (user?.isAdmin) return true
  return hasProFromEntitlement(ent)
}

/** Route guard: returns a 403 NextResponse if the user is not Pro, else null. */
export async function requirePro(userId: string): Promise<NextResponse | null> {
  if (await hasPro(userId)) return null
  return NextResponse.json({ error: "Pro required" }, { status: 403 })
}
