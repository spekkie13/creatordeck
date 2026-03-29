import { and, desc, eq, gt, gte, lte } from "drizzle-orm"
import { db } from "@/lib/db"
import { ytSuperChatEvents } from "@/lib/schema"
import type { YtSuperChatEvent, InsertYtSuperChatEvent } from "@/types/entities"

class YtSuperChatEventsRepository {
  async insert(data: InsertYtSuperChatEvent): Promise<void> {
    await db.insert(ytSuperChatEvents).values(data).onConflictDoNothing()
  }

  async findSince(channelId: string, since: Date): Promise<YtSuperChatEvent[]> {
    return db.select().from(ytSuperChatEvents)
      .where(and(eq(ytSuperChatEvents.channelId, channelId), gt(ytSuperChatEvents.occurredAt, since)))
      .orderBy(desc(ytSuperChatEvents.occurredAt))
  }

  async findInRange(channelId: string, from: Date, to: Date): Promise<YtSuperChatEvent[]> {
    return db.select().from(ytSuperChatEvents)
      .where(and(eq(ytSuperChatEvents.channelId, channelId), gte(ytSuperChatEvents.occurredAt, from), lte(ytSuperChatEvents.occurredAt, to)))
      .orderBy(desc(ytSuperChatEvents.occurredAt))
  }
}

export const ytSuperChatEventsRepository = new YtSuperChatEventsRepository()
