import { and, desc, eq, gt, gte, lte } from "drizzle-orm"

import type { YtSuperChatEvent, InsertYtSuperChatEvent } from "@/types/entities"

import { db } from "@/lib/db"
import { ytSuperChatEvents } from "@/lib/schema"

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

  async deleteByChannelId(channelId: string): Promise<void> {
    await db.delete(ytSuperChatEvents).where(eq(ytSuperChatEvents.channelId, channelId))
  }
}

export const ytSuperChatEventsRepository = new YtSuperChatEventsRepository()
