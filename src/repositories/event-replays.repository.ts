import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm"
import { db } from "@/lib/db"
import { eventReplays } from "@/lib/schema"

class EventReplaysRepository {
  async getPending(userId: string) {
    return db.select().from(eventReplays)
      .where(and(eq(eventReplays.userId, userId), isNull(eventReplays.processedAt)))
  }

  async create(userId: string, eventData: string): Promise<void> {
    await db.insert(eventReplays).values({ userId, eventData })
  }

  async markProcessed(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    await db.update(eventReplays)
      .set({ processedAt: new Date() })
      .where(inArray(eventReplays.id, ids))
  }

  async cleanup(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    await db.delete(eventReplays).where(
      and(isNotNull(eventReplays.processedAt), lt(eventReplays.processedAt, oneHourAgo))
    )
  }
}

export const eventReplaysRepository = new EventReplaysRepository()
