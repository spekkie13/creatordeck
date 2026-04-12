import { and, eq, isNull, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { ytStreamSessions } from "@/lib/schema"
import type { YtStreamSession } from "@/types/entities"

class YtStreamSessionsRepository {
  async openIfNew(channelId: string, broadcastId: string, title: string | null, startedAt: Date): Promise<void> {
    const existing = await db.select({ id: ytStreamSessions.id })
      .from(ytStreamSessions)
      .where(eq(ytStreamSessions.broadcastId, broadcastId))
      .limit(1)
    if (existing.length === 0) {
      await db.insert(ytStreamSessions).values({ channelId, broadcastId, title, startedAt })
    }
  }

  async isActive(channelId: string): Promise<boolean> {
    const rows = await db.select({ id: ytStreamSessions.id })
      .from(ytStreamSessions)
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
      .limit(1)
    return rows.length > 0
  }

  async closeByChannelId(channelId: string, endedAt: Date): Promise<void> {
    await db.update(ytStreamSessions)
      .set({ endedAt })
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
  }

  async updateLiveChatId(channelId: string, liveChatId: string): Promise<void> {
    await db.update(ytStreamSessions)
      .set({ liveChatId })
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
  }

  async updateChatState(channelId: string, liveChatId: string, chatPageToken: string): Promise<void> {
    await db.update(ytStreamSessions)
      .set({ liveChatId, chatPageToken })
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
  }

  async findAllOpenWithChatId(): Promise<YtStreamSession[]> {
    return db.select().from(ytStreamSessions)
      .where(and(isNull(ytStreamSessions.endedAt), isNotNull(ytStreamSessions.liveChatId)))
  }
}

export const ytStreamSessionsRepository = new YtStreamSessionsRepository()
