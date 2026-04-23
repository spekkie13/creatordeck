import { desc, eq, and, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { chatMessages } from "@/lib/schema"

type InsertChatMessage = {
  platform: string
  channelId: string
  eventId: string
  userId?: string | null
  userLogin?: string | null
  userDisplayName?: string | null
  message: string
  occurredAt: Date
}

class ChatMessagesRepository {
  async insert(data: InsertChatMessage): Promise<void> {
    await db.insert(chatMessages).values(data).onConflictDoNothing()
  }

  async getSince(channelId: string, since: Date, limit = 100) {
    return db.select().from(chatMessages)
      .where(and(eq(chatMessages.channelId, channelId), gt(chatMessages.occurredAt, since)))
      .orderBy(desc(chatMessages.occurredAt))
      .limit(limit)
  }

}

export const chatMessagesRepository = new ChatMessagesRepository()
