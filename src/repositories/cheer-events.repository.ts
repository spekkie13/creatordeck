import { and, desc, eq, gt, gte, lte } from "drizzle-orm"

import type { CheerEvent, InsertCheerEvent } from "@/types/entities"

import { db } from "@/lib/db"
import { cheerEvents } from "@/lib/schema"

class CheerEventsRepository {
  async insert(data: InsertCheerEvent): Promise<void> {
    await db.insert(cheerEvents).values(data).onConflictDoNothing()
  }

  async findSince(broadcasterId: string, since: Date): Promise<CheerEvent[]> {
    return db.select().from(cheerEvents)
      .where(and(eq(cheerEvents.broadcasterId, broadcasterId), gt(cheerEvents.occurredAt, since)))
      .orderBy(desc(cheerEvents.occurredAt))
  }

  async findInRange(broadcasterId: string, from: Date, to: Date): Promise<CheerEvent[]> {
    return db.select().from(cheerEvents)
      .where(and(eq(cheerEvents.broadcasterId, broadcasterId), gte(cheerEvents.occurredAt, from), lte(cheerEvents.occurredAt, to)))
      .orderBy(desc(cheerEvents.occurredAt))
  }

  async deleteByBroadcasterId(broadcasterId: string): Promise<void> {
    await db.delete(cheerEvents).where(eq(cheerEvents.broadcasterId, broadcasterId))
  }
}

export const cheerEventsRepository = new CheerEventsRepository()