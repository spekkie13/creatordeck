import { eq } from "drizzle-orm"

import type { InsertEventSubSubscription } from "@/types/entities"

import { db } from "@/lib/db"
import { eventsubSubscriptions } from "@/lib/schema"

class EventSubSubscriptionsRepository {
  async insert(data: InsertEventSubSubscription): Promise<void> {
    await db.insert(eventsubSubscriptions).values(data).onConflictDoNothing()
  }

  async existsByBroadcasterId(broadcasterId: string): Promise<boolean> {
    const rows = await db.select({ id: eventsubSubscriptions.id })
      .from(eventsubSubscriptions)
      .where(eq(eventsubSubscriptions.broadcasterId, broadcasterId))
      .limit(1)
    return rows.length > 0
  }

  async deleteByBroadcasterId(broadcasterId: string): Promise<void> {
    await db.delete(eventsubSubscriptions).where(eq(eventsubSubscriptions.broadcasterId, broadcasterId))
  }
}

export const eventSubSubscriptionsRepository = new EventSubSubscriptionsRepository()