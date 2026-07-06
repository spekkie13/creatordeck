import { and, eq, isNull, lt, sql } from "drizzle-orm"
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

  /**
   * Ends ingestion for a channel by deleting its open session row. The session
   * carries only live-ingestion state (liveChatId, resume chatPageToken) that no
   * feature reads once the stream is over, so we drop it rather than retain it —
   * this keeps YouTube broadcast data out of storage the moment you go offline.
   * Before deleting, emits a one-line session summary (duration, chat polls,
   * estimated quota units) — the quota-instrumentation record used to size the
   * Google quota-increase request (spec §3.6). Idempotent. `deleteOlderThan`
   * remains a safety net for sessions orphaned by a crash that never reached
   * close().
   */
  async close(channelId: string): Promise<void> {
    const session = await this.findActive(channelId)
    if (!session) return
    const durationSec = Math.round((Date.now() - session.startedAt.getTime()) / 1000)
    console.log("[yt-session] closed", {
      channelId,
      durationSec,
      chatPolls: session.pollCount,
      estQuotaUnits: session.quotaUnits,
      lastPolledAt: session.lastPolledAt,
    })
    await db.delete(ytStreamSessions).where(eq(ytStreamSessions.id, session.id))
  }

  /**
   * Adds the estimated quota cost of one broadcast-detection `liveBroadcasts.list`
   * call to the open session, so per-session `quotaUnits` reflects detection as
   * well as chat polling (spec §3.6 — detection is the realistic quota trap).
   * No-op when no session is open: detection calls made while idle (no live
   * broadcast) have no session to attribute to and are a separate, low, constant
   * background cost (~1 unit per slow check).
   */
  async recordDetection(channelId: string, units: number): Promise<void> {
    await db.update(ytStreamSessions)
      .set({ quotaUnits: sql`${ytStreamSessions.quotaUnits} + ${units}` })
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

  /** Retention purge: erase broadcast sessions started before the cutoff. Returns rows deleted. */
  async deleteOlderThan(cutoff: Date): Promise<number> {
    const deleted = await db.delete(ytStreamSessions)
      .where(lt(ytStreamSessions.startedAt, cutoff))
      .returning({ id: ytStreamSessions.id })
    return deleted.length
  }
}

export const ytStreamSessionsRepository = new YtStreamSessionsRepository()
