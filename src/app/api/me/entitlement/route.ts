import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { hasProFromEntitlement, PAST_DUE_GRACE_MS } from "@/lib/entitlement"
import { entitlementRepository, userRepository } from "@/repositories"

// GET /api/me/entitlement — authoritative Pro state for the current user. Used
// by the success-page activation poll and the client `useEntitlement` hook, so
// the UI never depends on the stale-cached session for paid state.
export async function GET(): Promise<NextResponse> {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  // Same predicate as hasPro (owner bypass OR entitlement), but sharing the
  // entitlement row this route needs anyway — 2 reads instead of 3 on the
  // most frequently polled route.
  const [user, ent] = await Promise.all([
    userRepository.findById(session.userId),
    entitlementRepository.getByUserId(session.userId),
  ])
  const isPro = !!user?.isAdmin || hasProFromEntitlement(ent)

  return NextResponse.json({
    isPro,
    plan: isPro ? "pro" : "free",
    status: ent?.status ?? "none",
    trialEndsAt: ent?.trialEndsAt ?? null,
    currentPeriodEnd: ent?.currentPeriodEnd ?? null,
    // Dunning deadline: past_due keeps Pro for PAST_DUE_GRACE_MS after the last
    // webhook write (src/lib/entitlement.ts effectiveStatus).
    graceEndsAt:
      ent?.status === "past_due"
        ? new Date(ent.updatedAt.getTime() + PAST_DUE_GRACE_MS)
        : null,
  })
}
