import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { goals } from "@/lib/schema"

export type GoalType = "twitch_follow" | "youtube_member"

export type GoalRow = {
  id: string
  userId: string
  type: string
  goal: number
  endsAt: Date | null
  updatedAt: Date
}

class GoalsRepository {
  async findByUserId(userId: string): Promise<GoalRow[]> {
    return db.select().from(goals).where(eq(goals.userId, userId))
  }

  async findByUserIdAndType(userId: string, type: GoalType): Promise<GoalRow | null> {
    const rows = await db.select().from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.type, type)))
      .limit(1)
    return rows[0] ?? null
  }

  async upsert(userId: string, type: GoalType, goal: number, endsAt: Date | null): Promise<void> {
    await db.insert(goals)
      .values({ userId, type, goal, endsAt, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [goals.userId, goals.type],
        set: { goal, endsAt, updatedAt: new Date() },
      })
  }
}

export const goalsRepository = new GoalsRepository()
