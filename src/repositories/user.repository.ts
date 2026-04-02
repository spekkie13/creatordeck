import { eq } from "drizzle-orm"

import type { User } from "@/types/entities"
import type { StripeInfo } from "@/types/stripeInfo"

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

  async setStripeCustomer(userId: string, customerId: string, subscriptionId: string): Promise<void> {
    await db
        .update(users)
        .set({ stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId })
        .where(eq(users.id, userId))
  }

  async clearStripeSubscription(userId: string): Promise<void> {
    await db
        .update(users)
        .set({ stripeSubscriptionId: null })
        .where(eq(users.id, userId))
  }

  async findByStripeCustomerId(customerId: string): Promise<{ id: string; tier: string } | null> {
    const rows =
        await db
            .select({ id: users.id, tier: users.tier })
            .from(users)
            .where(
                eq(users.stripeCustomerId, customerId)
            )
            .limit(1)

    return rows[0] ?? null
  }

  async getStripeInfo(userId: string): Promise<StripeInfo> {
    const rows: StripeInfo[] = await db.select({
      stripeCustomerId: users.stripeCustomerId,
      stripeSubscriptionId: users.stripeSubscriptionId,
      tier: users.tier,
    }).from(users).where(eq(users.id, userId)).limit(1)
    return rows[0] ?? { stripeCustomerId: null, stripeSubscriptionId: null, tier: "free" }
  }
}

export const userRepository = new UserRepository()
