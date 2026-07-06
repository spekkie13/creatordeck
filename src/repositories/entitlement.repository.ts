import { eq } from "drizzle-orm"

import type { Entitlement } from "@/types/entities"

import { db } from "@/lib/db"
import { entitlements } from "@/lib/schema"

type WebhookState = {
  userId: string
  plan: "free" | "pro"
  status: "none" | "trialing" | "active" | "canceled_active" | "past_due" | "revoked"
  polarCustomerId: string | null
  polarSubscriptionId: string | null
  currentPeriodEnd: Date | null
  /** Only supplied on trialing events; omit to leave any existing value untouched. */
  trialEndsAt?: Date | null
}

class EntitlementRepository {
  async getByUserId(userId: string): Promise<Entitlement | null> {
    const rows = await db.select().from(entitlements).where(eq(entitlements.userId, userId)).limit(1)
    return rows[0] ?? null
  }

  async findByPolarCustomerId(polarCustomerId: string): Promise<Entitlement | null> {
    const rows = await db.select().from(entitlements).where(eq(entitlements.polarCustomerId, polarCustomerId)).limit(1)
    return rows[0] ?? null
  }

  /**
   * Applies absolute subscription state from a verified webhook (spec §3.3):
   * upsert by userId, overwriting status/period/plan wholesale — never relative
   * — so duplicate and out-of-order deliveries converge. `trialEndsAt` is only
   * written when the caller supplies it (trialing events); it is otherwise left
   * untouched so non-trial deliveries never clobber a set trial end.
   */
  async upsertFromWebhook(s: WebhookState): Promise<void> {
    const state = {
      plan: s.plan,
      status: s.status,
      polarCustomerId: s.polarCustomerId,
      polarSubscriptionId: s.polarSubscriptionId,
      currentPeriodEnd: s.currentPeriodEnd,
      updatedAt: new Date(),
      ...(s.trialEndsAt !== undefined ? { trialEndsAt: s.trialEndsAt } : {}),
    }
    await db.insert(entitlements)
      .values({ userId: s.userId, ...state })
      .onConflictDoUpdate({ target: entitlements.userId, set: state })
  }
}

export const entitlementRepository = new EntitlementRepository()
