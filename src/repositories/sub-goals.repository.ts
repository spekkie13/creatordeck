import { eq } from "drizzle-orm"

import type { SubGoal } from "@/types/entities"

import { db } from "@/lib/db"
import { subGoals } from "@/lib/schema"

class SubGoalsRepository {
  async findByBroadcasterId(broadcasterId: string): Promise<SubGoal | null> {
    const rows = await db.select().from(subGoals).where(eq(subGoals.broadcasterId, broadcasterId)).limit(1)
    return rows[0] ?? null
  }

  async upsert(broadcasterId: string, goal: number, initialCount: number, endsAt?: Date | null): Promise<void> {
    await db.insert(subGoals)
      .values({ broadcasterId, goal, initialCount, endsAt: endsAt ?? null })
      .onConflictDoUpdate({ target: subGoals.broadcasterId, set: { goal, initialCount, endsAt: endsAt ?? null, updatedAt: new Date() } })
  }

  async deleteByBroadcasterId(broadcasterId: string): Promise<void> {
    await db.delete(subGoals).where(eq(subGoals.broadcasterId, broadcasterId))
  }
}

export const subGoalsRepository = new SubGoalsRepository()