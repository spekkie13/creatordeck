import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { users, entitlements } from "@/lib/schema"
import { requireSession } from "@/lib/session-auth"
import {SessionResult} from "@/types/session";

const DAY_MS = 24 * 60 * 60 * 1000

// Entitlement-state presets for walking Gate 2 without waiting on Polar
// dunning/trial timers. Sandbox webhook flows remain the authoritative test
// for state *transitions*; these only set absolute local state.
const ENTITLEMENT_PRESETS = {
  free:            () => ({ plan: "free" as const, status: "none" as const, trialEndsAt: null, currentPeriodEnd: null, updatedAt: new Date() }),
  trialing:        () => ({ plan: "pro" as const, status: "trialing" as const, trialEndsAt: new Date(Date.now() + 14 * DAY_MS), currentPeriodEnd: new Date(Date.now() + 14 * DAY_MS), updatedAt: new Date() }),
  trial_lapsed:    () => ({ plan: "pro" as const, status: "trialing" as const, trialEndsAt: new Date(Date.now() - DAY_MS), currentPeriodEnd: new Date(Date.now() - DAY_MS), updatedAt: new Date() }),
  active:          () => ({ plan: "pro" as const, status: "active" as const, trialEndsAt: null, currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS), updatedAt: new Date() }),
  canceled_active: () => ({ plan: "pro" as const, status: "canceled_active" as const, trialEndsAt: null, currentPeriodEnd: new Date(Date.now() + 20 * DAY_MS), updatedAt: new Date() }),
  past_due:        () => ({ plan: "pro" as const, status: "past_due" as const, trialEndsAt: null, currentPeriodEnd: new Date(Date.now() - DAY_MS), updatedAt: new Date() }),
  past_due_lapsed: () => ({ plan: "pro" as const, status: "past_due" as const, trialEndsAt: null, currentPeriodEnd: new Date(Date.now() - 5 * DAY_MS), updatedAt: new Date(Date.now() - 4 * DAY_MS) }),
  revoked:         () => ({ plan: "free" as const, status: "revoked" as const, trialEndsAt: null, currentPeriodEnd: null, updatedAt: new Date() }),
} satisfies Record<string, () => Record<string, unknown>>

export type EntitlementPreset = keyof typeof ENTITLEMENT_PRESETS

// Dev-only. Toggles the owner flag (`isAdmin`) and/or applies an entitlement
// preset to the caller's row, to simulate every billing state locally.
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 404 })
  }

  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse)
    return result
  const { session } = result

  const { isAdmin, entitlement } = await req.json()

  if (isAdmin !== undefined) {
    await db.update(users).set({ isAdmin: !!isAdmin }).where(eq(users.id, session.userId))
  }

  if (entitlement !== undefined) {
    const preset = ENTITLEMENT_PRESETS[entitlement as EntitlementPreset]
    if (!preset) return NextResponse.json({ error: "Unknown preset" }, { status: 400 })
    const values = preset()
    await db
      .insert(entitlements)
      .values({ userId: session.userId, ...values })
      .onConflictDoUpdate({ target: entitlements.userId, set: values })
  }

  return NextResponse.json({ ok: true, isAdmin: isAdmin !== undefined ? !!isAdmin : undefined, entitlement })
}
