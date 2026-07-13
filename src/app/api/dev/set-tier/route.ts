import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { users, entitlements } from "@/lib/schema"
import { requireSession } from "@/lib/session-auth"
import { PAST_DUE_GRACE_MS } from "@/lib/entitlement"
import {SessionResult} from "@/types/session";

const DAY_MS = 24 * 60 * 60 * 1000

type PresetValues = Omit<typeof entitlements.$inferInsert, "id" | "userId">

// Entitlement-state presets for walking Gate 2 without waiting on Polar
// dunning/trial timers. Sandbox webhook flows remain the authoritative test
// for state *transitions*; these only set absolute local state — including
// nulling the Polar ids, so a preset applied over a real sandbox subscription
// can't leave a stale polarSubscriptionId (billing's hasSubscription check).
const BASE = { polarCustomerId: null, polarSubscriptionId: null, trialEndsAt: null, currentPeriodEnd: null }

const ENTITLEMENT_PRESETS = {
  free:            () => ({ ...BASE, plan: "free", status: "none", updatedAt: new Date() }),
  trialing:        () => ({ ...BASE, plan: "pro", status: "trialing", trialEndsAt: new Date(Date.now() + 14 * DAY_MS), currentPeriodEnd: new Date(Date.now() + 14 * DAY_MS), updatedAt: new Date() }),
  trial_lapsed:    () => ({ ...BASE, plan: "pro", status: "trialing", trialEndsAt: new Date(Date.now() - DAY_MS), currentPeriodEnd: new Date(Date.now() - DAY_MS), updatedAt: new Date() }),
  active:          () => ({ ...BASE, plan: "pro", status: "active", currentPeriodEnd: new Date(Date.now() + 30 * DAY_MS), updatedAt: new Date() }),
  canceled_active: () => ({ ...BASE, plan: "pro", status: "canceled_active", currentPeriodEnd: new Date(Date.now() + 20 * DAY_MS), updatedAt: new Date() }),
  past_due:        () => ({ ...BASE, plan: "pro", status: "past_due", currentPeriodEnd: new Date(Date.now() - DAY_MS), updatedAt: new Date() }),
  // "grace over" derives from the real constant so a grace-window change can't
  // silently turn this preset back into an in-grace state.
  past_due_lapsed: () => ({ ...BASE, plan: "pro", status: "past_due", currentPeriodEnd: new Date(Date.now() - PAST_DUE_GRACE_MS - 2 * DAY_MS), updatedAt: new Date(Date.now() - PAST_DUE_GRACE_MS - DAY_MS) }),
  revoked:         () => ({ ...BASE, plan: "free", status: "revoked", updatedAt: new Date() }),
} satisfies Record<string, () => PresetValues>

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
    // Object.hasOwn: a prototype key ("toString") must 400, not resolve.
    if (typeof entitlement !== "string" || !Object.hasOwn(ENTITLEMENT_PRESETS, entitlement)) {
      return NextResponse.json({ error: "Unknown preset" }, { status: 400 })
    }
    const values = ENTITLEMENT_PRESETS[entitlement as EntitlementPreset]()
    await db
      .insert(entitlements)
      .values({ userId: session.userId, ...values })
      .onConflictDoUpdate({ target: entitlements.userId, set: values })
  }

  return NextResponse.json({ ok: true, isAdmin: isAdmin !== undefined ? !!isAdmin : undefined, entitlement })
}
