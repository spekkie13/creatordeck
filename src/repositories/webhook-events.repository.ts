import { db } from "@/lib/db"
import { webhookEvents } from "@/lib/schema"

class WebhookEventsRepository {
  /**
   * Idempotency ledger (spec §3.3). Inserts the event id; returns true if this
   * is the first time we've seen it, false if it was already processed (unique
   * violation → `onConflictDoNothing` inserts nothing). Callers ack 200 and skip
   * on false.
   */
  async record(id: string, type: string): Promise<boolean> {
    const inserted = await db.insert(webhookEvents)
      .values({ id, type })
      .onConflictDoNothing({ target: webhookEvents.id })
      .returning({ id: webhookEvents.id })
    return inserted.length > 0
  }
}

export const webhookEventsRepository = new WebhookEventsRepository()
