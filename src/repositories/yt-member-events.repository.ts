import { and, desc, eq, gt, gte, lte, sql } from "drizzle-orm"

import type { YtMemberEvent, InsertYtMemberEvent } from "@/types/entities"

import { db } from "@/lib/db"
import { ytMemberEvents } from "@/lib/schema"

class YtMemberEventsRepository {
  async insert(data: InsertYtMemberEvent): Promise<void> {
    await db.insert(ytMemberEvents).values(data).onConflictDoNothing()
  }

  async findSince(channelId: string, since: Date): Promise<YtMemberEvent[]> {
    return db.select().from(ytMemberEvents)
      .where(and(eq(ytMemberEvents.channelId, channelId), gt(ytMemberEvents.occurredAt, since)))
      .orderBy(desc(ytMemberEvents.occurredAt))
  }

  async findInRange(channelId: string, from: Date, to: Date): Promise<YtMemberEvent[]> {
    return db.select().from(ytMemberEvents)
      .where(and(eq(ytMemberEvents.channelId, channelId), gte(ytMemberEvents.occurredAt, from), lte(ytMemberEvents.occurredAt, to)))
      .orderBy(desc(ytMemberEvents.occurredAt))
  }

  async countByChannelId(channelId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(ytMemberEvents)
      .where(eq(ytMemberEvents.channelId, channelId))
    return Number(result[0].count)
  }

  async deleteByChannelId(channelId: string): Promise<void> {
    await db.delete(ytMemberEvents).where(eq(ytMemberEvents.channelId, channelId))
  }
}

export const ytMemberEventsRepository = new YtMemberEventsRepository()
