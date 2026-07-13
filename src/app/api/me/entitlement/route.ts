import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { hasPro } from "@/lib/require-pro"
import { PAST_DUE_GRACE_MS } from "@/lib/entitlement"
import { entitlementRepository } from "@/repositories"

// GET /api/me/entitlement — authoritative Pro state for the current user. Used
// by the success-page activation poll and the client `useEntitlement` hook, so
// the UI never depends on the stale-cached session for paid state.
export async function GET(): Promise<NextResponse> {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const [isPro, ent] = await Promise.all([
    hasPro(session.userId),
    entitlementRepository.getByUserId(session.userId),
  ])

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
