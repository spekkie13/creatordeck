import { and, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { ytStreamSessions } from "@/lib/schema"
import type { YtStreamSession } from "@/types/entities"

class YtStreamSessionsRepository {
  async isActive(channelId: string): Promise<boolean> {
    const rows = await db.select({ id: ytStreamSessions.id })
      .from(ytStreamSessions)
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
      .limit(1)
    return rows.length > 0
  }

  /** The currently-open ingestion session for a channel (endedAt IS NULL), or null. */
  async findActive(channelId: string): Promise<YtStreamSession | null> {
    const rows = await db.select()
      .from(ytStreamSessions)
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
      .limit(1)
    return rows[0] ?? null
  }

  /**
   * Opens (or refreshes) the open session for a channel. At most one session is
   * open per channel: if one already exists it is updated with the current
   * broadcast's id/title/liveChatId (handles a channel going live under a new
   * broadcast without an intervening close); otherwise a new row is inserted.
   */
  async open(data: {
    channelId: string
    broadcastId: string
    title: string | null
    liveChatId: string | null
  }): Promise<YtStreamSession> {
    const existing = await this.findActive(data.channelId)
    if (existing) {
      const [row] = await db.update(ytStreamSessions)
        .set({ broadcastId: data.broadcastId, title: data.title, liveChatId: data.liveChatId })
        .where(eq(ytStreamSessions.id, existing.id))
        .returning()
      return row
    }
    const [row] = await db.insert(ytStreamSessions)
      .values({
        channelId: data.channelId,
        broadcastId: data.broadcastId,
        title: data.title,
        liveChatId: data.liveChatId,
        startedAt: new Date(),
      })
      .returning()
    return row
  }

  /** Marks all open sessions for a channel as ended. Idempotent. */
  async close(channelId: string): Promise<void> {
    await db.update(ytStreamSessions)
      .set({ endedAt: new Date() })
      .where(and(eq(ytStreamSessions.channelId, channelId), isNull(ytStreamSessions.endedAt)))
  }

  /**
   * Records the outcome of one ingestion tick: persists the resume pageToken and
   * accumulates instrumentation (poll count, estimated quota units, last-polled
   * time). `units` is the measured/estimated cost of the call that produced this
   * page (see YT_LIST_UNITS_ESTIMATE — a placeholder until the Gate 1 spike /
   * console metrics supply a measured value).
   */
  async advance(id: string, pageToken: string | null, units: number): Promise<void> {
    await db.update(ytStreamSessions)
      .set({
        chatPageToken: pageToken,
        pollCount: sql`${ytStreamSessions.pollCount} + 1`,
        quotaUnits: sql`${ytStreamSessions.quotaUnits} + ${units}`,
        lastPolledAt: new Date(),
      })
      .where(eq(ytStreamSessions.id, id))
  }

  async deleteByChannelId(channelId: string): Promise<void> {
    await db.delete(ytStreamSessions).where(eq(ytStreamSessions.channelId, channelId))
  }
}

export const ytStreamSessionsRepository = new YtStreamSessionsRepository()
