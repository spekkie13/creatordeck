import { eq } from "drizzle-orm"

import type { User } from "@/types/entities"
import type { BillingInfo } from "@/types/billing-info"

import { db } from "@/lib/db"
import { users } from "@/lib/schema"

class UserRepository {
  async findById(id: string): Promise<User | null> {
    const rows: User[] = await db
        .select()
        .from(users)
        .where(
            eq(users.id, id)
        )
        .limit(1)

    return rows[0] ?? null
  }

  async findByApiKey(apiKey: string): Promise<User | null> {
    const rows: User[] = await db
        .select()
        .from(users)
        .where(eq(users.apiKey, apiKey))
        .limit(1)

    return rows[0] ?? null
  }

  async findByWidgetToken(token: string): Promise<User | null> {
    const rows: User[] = await db.select().from(users).where(eq(users.widgetToken, token)).limit(1)
    return rows[0] ?? null
  }

  async setWidgetToken(userId: string, token: string): Promise<void> {
    await db
        .update(users)
        .set({ widgetToken: token })
        .where(
            eq(users.id, userId)
        )
  }

  async completeOnboarding(userId: string): Promise<void> {
    await db.update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, userId))
  }

  async getTier(userId: string): Promise<string> {
    const rows = await db.select({ tier: users.tier }).from(users).where(eq(users.id, userId)).limit(1)
    return rows[0]?.tier ?? "free"
  }

  async setTier(userId: string, tier: string): Promise<void> {
    await db
        .update(users)
        .set({ tier: tier as "free" | "tier1" | "tier2" | "tier3" })
        .where(eq(users.id, userId))
  }

  async setCustomer(userId: string, customerId: string, subscriptionId: string): Promise<void> {
    await db
        .update(users)
        .set({ LsCustomerId: customerId, LsSubscriptionId: subscriptionId })
        .where(eq(users.id, userId))
  }

  async clearSubscription(userId: string): Promise<void> {
    await db
        .update(users)
        .set({ LsSubscriptionId: null })
        .where(eq(users.id, userId))
  }

  async findByCustomerId(customerId: string): Promise<{ id: string; tier: string } | null> {
    const rows =
        await db
            .select({ id: users.id, tier: users.tier })
            .from(users)
            .where(
                eq(users.LsCustomerId, customerId)
            )
            .limit(1)

    return rows[0] ?? null
  }

  async getCustomerInfo(userId: string): Promise<BillingInfo> {
    const rows: BillingInfo[] = await db.select({
      customerId: users.LsCustomerId,
      subscriptionId: users.LsSubscriptionId,
      tier: users.tier,
    }).from(users).where(eq(users.id, userId)).limit(1)
    return rows[0] ?? { customerId: null, subscriptionId: null, tier: "free" }
  }

  // Deletes the user row. FK cascades remove linked_accounts, feedback, goals,
  // event_replays, and feature_flag_overrides (see schema onDelete: "cascade").
  async deleteById(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
  }
}

export const userRepository = new UserRepository()
