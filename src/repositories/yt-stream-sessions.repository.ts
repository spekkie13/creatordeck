import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { ytStreamSessions } from "@/lib/schema"

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
}

export const ytStreamSessionsRepository = new YtStreamSessionsRepository()
