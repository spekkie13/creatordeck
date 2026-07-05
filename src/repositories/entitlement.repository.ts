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
   * Creates the user's entitlement row with a 14-day trial if one does not yet
   * exist. `onConflictDoNothing` on the unique userId enforces one-trial-ever:
   * an existing row (and its `trialEndsAt`) is never reset.
   */
  async ensureWithTrial(userId: string, trialEndsAt: Date): Promise<void> {
    await db.insert(entitlements)
      .values({ userId, plan: "free", status: "trialing", trialEndsAt })
      .onConflictDoNothing({ target: entitlements.userId })
  }

  /**
   * Applies absolute subscription state from a verified webhook (spec §3.3):
   * upsert by userId, overwriting status/period/plan wholesale — never relative
   * — so duplicate and out-of-order deliveries converge. `trialEndsAt` is left
   * untouched (owned by the local trial logic).
   */
  async upsertFromWebhook(s: WebhookState): Promise<void> {
    await db.insert(entitlements)
      .values({
        userId: s.userId,
        plan: s.plan,
        status: s.status,
        polarCustomerId: s.polarCustomerId,
        polarSubscriptionId: s.polarSubscriptionId,
        currentPeriodEnd: s.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: entitlements.userId,
        set: {
          plan: s.plan,
          status: s.status,
          polarCustomerId: s.polarCustomerId,
          polarSubscriptionId: s.polarSubscriptionId,
          currentPeriodEnd: s.currentPeriodEnd,
          updatedAt: new Date(),
        },
      })
  }
}

export const entitlementRepository = new EntitlementRepository()
