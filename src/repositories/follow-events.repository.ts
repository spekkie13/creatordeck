import { and, desc, eq, gt, gte, lte, sql } from "drizzle-orm"

import type { FollowEvent, InsertFollowEvent } from "@/types/entities"

import { db } from "@/lib/db"
import { followEvents } from "@/lib/schema"

class FollowEventsRepository {
  async insert(data: InsertFollowEvent): Promise<void> {
    await db.insert(followEvents).values(data)
      .onConflictDoUpdate({
        target: [followEvents.broadcasterId, followEvents.userId],
        set: {
          eventId: data.eventId,
          userLogin: data.userLogin,
          userDisplayName: data.userDisplayName,
          occurredAt: data.occurredAt,
        },
      })
  }

  async findTrackedUserIds(broadcasterId: string): Promise<Set<string>> {
    const rows = await db
      .select({ userId: followEvents.userId })
      .from(followEvents)
      .where(eq(followEvents.broadcasterId, broadcasterId))
    return new Set(rows.map(r => r.userId).filter((id): id is string => id !== null))
  }

  async findSince(broadcasterId: string, since: Date): Promise<FollowEvent[]> {
    return db.select().from(followEvents)
      .where(and(eq(followEvents.broadcasterId, broadcasterId), gt(followEvents.occurredAt, since)))
      .orderBy(desc(followEvents.occurredAt))
  }

  async findInRange(broadcasterId: string, from: Date, to: Date): Promise<FollowEvent[]> {
    return db.select().from(followEvents)
      .where(and(eq(followEvents.broadcasterId, broadcasterId), gte(followEvents.occurredAt, from), lte(followEvents.occurredAt, to)))
      .orderBy(desc(followEvents.occurredAt))
  }

  async countByBroadcasterId(broadcasterId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(followEvents)
      .where(eq(followEvents.broadcasterId, broadcasterId))
    return Number(result[0].count)
  }

  async deleteByBroadcasterId(broadcasterId: string): Promise<void> {
    await db.delete(followEvents).where(eq(followEvents.broadcasterId, broadcasterId))
  }
}

export const followEventsRepository = new FollowEventsRepository()