import { eq } from "drizzle-orm"

import type { User } from "@/types/entities"

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

  // Deletes the user row. FK cascades remove linked_accounts, entitlements,
  // feedback, goals, event_replays, and feature_flag_overrides (see schema
  // onDelete: "cascade").
  async deleteById(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id))
  }
}

export const userRepository = new UserRepository()
