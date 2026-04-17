import { and, eq, isNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { ytStreamSessions } from "@/lib/schema"

class YtStreamSessionsRepository {
  async isActive(channelId: string): Promise<boolean> {
    const rows = await db.select({ id: ytStreamSessions.id })
      .from(ytStreamSessions)
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
      .limit(1)
    return rows.length > 0
  }
}

export const ytStreamSessionsRepository = new YtStreamSessionsRepository()
