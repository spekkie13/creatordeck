import { and, asc, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm"

import type { LiveEvent } from "@/types/events"

import { db } from "@/lib/db"
import { cheerEvents, followEvents, raidEvents, streamSessions, subEvents, ytMemberEvents, ytSuperChatEvents } from "@/lib/schema"
import { mapCheerToEvent, mapFollowToEvent, mapRaidToEvent, mapSubToEvent } from "@/lib/event-mappers"

import { AnalyticsOverview, AnalyticsSession, AnalyticsTotals, DayBucket, SessionDetail } from "@/services/analytics.types"

const DAY = sql`'day'`

function dayKey(isoString: string): string {
  return isoString.slice(0, 10)
}

export class AnalyticsService {
  async getOverview(
    broadcasterId: string,
    youtubeChannelId: string | null,
    since: Date,
  ): Promise<AnalyticsOverview> {
    const hasTwitch: boolean = !!broadcasterId
    const hasYT: boolean = !!youtubeChannelId

    const [twitchResults, ytResults] = await Promise.all([
      // ── Twitch queries (checked once) ─────────────────────────────────────
      hasTwitch
        ? Promise.all([
            // Totals
            db.select({ count: count() }).from(followEvents)
              .where(and(eq(followEvents.broadcasterId, broadcasterId), gte(followEvents.occurredAt, since))),
            db.select({ count: count() }).from(subEvents)
              .where(and(eq(subEvents.broadcasterId, broadcasterId), gte(subEvents.occurredAt, since))),
            db.select({ count: count(), total: sum(cheerEvents.bits) }).from(cheerEvents)
              .where(and(eq(cheerEvents.broadcasterId, broadcasterId), gte(cheerEvents.occurredAt, since))),
            db.select({ count: count(), total: sum(raidEvents.viewerCount) }).from(raidEvents)
              .where(and(eq(raidEvents.broadcasterId, broadcasterId), gte(raidEvents.occurredAt, since))),
            // By day
            db.select({ day: sql<string>`date_trunc(${DAY}, ${followEvents.occurredAt})::text`, count: count() })
              .from(followEvents)
              .where(and(eq(followEvents.broadcasterId, broadcasterId), gte(followEvents.occurredAt, since)))
              .groupBy(sql`date_trunc(${DAY}, ${followEvents.occurredAt})`),
            db.select({ day: sql<string>`date_trunc(${DAY}, ${subEvents.occurredAt})::text`, count: count() })
              .from(subEvents)
              .where(and(eq(subEvents.broadcasterId, broadcasterId), gte(subEvents.occurredAt, since)))
              .groupBy(sql`date_trunc(${DAY}, ${subEvents.occurredAt})`),
            db.select({ day: sql<string>`date_trunc(${DAY}, ${cheerEvents.occurredAt})::text`, count: count(), total: sum(cheerEvents.bits) })
              .from(cheerEvents)
              .where(and(eq(cheerEvents.broadcasterId, broadcasterId), gte(cheerEvents.occurredAt, since)))
              .groupBy(sql`date_trunc(${DAY}, ${cheerEvents.occurredAt})`),
            db.select({ day: sql<string>`date_trunc(${DAY}, ${raidEvents.occurredAt})::text`, count: count(), total: sum(raidEvents.viewerCount) })
              .from(raidEvents)
              .where(and(eq(raidEvents.broadcasterId, broadcasterId), gte(raidEvents.occurredAt, since)))
              .groupBy(sql`date_trunc(${DAY}, ${raidEvents.occurredAt})`),
            // Sessions
            db.select().from(streamSessions)
              .where(and(eq(streamSessions.broadcasterId, broadcasterId), gte(streamSessions.startedAt, since)))
              .orderBy(desc(streamSessions.startedAt)),
          ])
        : Promise.resolve([
            [{ count: 0 }],
            [{ count: 0 }],
            [{ count: 0, total: null as string | null }],
            [{ count: 0, total: null as string | null }],
            [] as { day: string; count: number }[],
            [] as { day: string; count: number }[],
            [] as { day: string; count: number; total: string | null }[],
            [] as { day: string; count: number; total: string | null }[],
            [] as (typeof streamSessions.$inferSelect)[],
          ] as const),

      // ── YouTube queries (checked once) ────────────────────────────────────
      hasYT
        ? Promise.all([
            // Totals
            db.select({ currency: ytSuperChatEvents.currency, count: count(), total: sum(ytSuperChatEvents.amountMicros) })
              .from(ytSuperChatEvents)
              .where(and(eq(ytSuperChatEvents.channelId, youtubeChannelId!), gte(ytSuperChatEvents.occurredAt, since)))
              .groupBy(ytSuperChatEvents.currency),
            db.select({ count: count() }).from(ytMemberEvents)
              .where(and(eq(ytMemberEvents.channelId, youtubeChannelId!), gte(ytMemberEvents.occurredAt, since))),
            // By day
            db.select({ day: sql<string>`date_trunc(${DAY}, ${ytSuperChatEvents.occurredAt})::text`, count: count(), total: sum(ytSuperChatEvents.amountMicros) })
              .from(ytSuperChatEvents)
              .where(and(eq(ytSuperChatEvents.channelId, youtubeChannelId!), gte(ytSuperChatEvents.occurredAt, since)))
              .groupBy(sql`date_trunc(${DAY}, ${ytSuperChatEvents.occurredAt})`),
            db.select({ day: sql<string>`date_trunc(${DAY}, ${ytMemberEvents.occurredAt})::text`, count: count() })
              .from(ytMemberEvents)
              .where(and(eq(ytMemberEvents.channelId, youtubeChannelId!), gte(ytMemberEvents.occurredAt, since)))
              .groupBy(sql`date_trunc(${DAY}, ${ytMemberEvents.occurredAt})`),
          ])
        : Promise.resolve([
            [] as { currency: string; count: number; total: string | null }[],
            [{ count: 0 }],
            [] as { day: string; count: number; total: string | null }[],
            [] as { day: string; count: number }[],
          ] as const),
    ])

    const [followTotals, subTotals, bitsTotals, raidTotals, followsByDay, subsByDay, bitsByDay, raidsByDay, sessionRows] = twitchResults
    const [superchatTotals, memberTotals, superchatsByDay, membersByDay] = ytResults

    // ── Build totals ────────────────────────────────────────────────────────
    const byCurrency: Record<string, number> = {}
    let superchatCount = 0
    for (const row of superchatTotals) {
      byCurrency[row.currency] = Number(row.total ?? 0) / 1_000_000
      superchatCount += Number(row.count)
    }

    const totals: AnalyticsTotals = {
      follows: Number(followTotals[0]?.count ?? 0),
      subs: Number(subTotals[0]?.count ?? 0),
      bits: { count: Number(bitsTotals[0]?.count ?? 0), total: Number(bitsTotals[0]?.total ?? 0) },
      raids: { count: Number(raidTotals[0]?.count ?? 0), total: Number(raidTotals[0]?.total ?? 0) },
      superchats: { count: superchatCount, byCurrency },
      members: Number(memberTotals[0]?.count ?? 0),
    }

    // ── Build byDay (zero-fill all days in range) ────────────────────────────
    const dayMap = new Map<string, DayBucket>()
    const cursor = new Date(since)
    cursor.setUTCHours(0, 0, 0, 0)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10)
      dayMap.set(key, {
        date: key,
        follows: 0, subs: 0, bitsCount: 0, raidsCount: 0, superchatsCount: 0, members: 0,
        bitsTotal: 0, raidViewers: 0, superchatsTotal: 0,
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    for (const r of followsByDay) {
      const b = dayMap.get(dayKey(r.day)); if (b) b.follows = Number(r.count)
    }
    for (const r of subsByDay) {
      const b = dayMap.get(dayKey(r.day)); if (b) b.subs = Number(r.count)
    }
    for (const r of bitsByDay) {
      const b = dayMap.get(dayKey(r.day))
      if (b) { b.bitsCount = Number(r.count); b.bitsTotal = Number(r.total ?? 0) }
    }
    for (const r of raidsByDay) {
      const b = dayMap.get(dayKey(r.day))
      if (b) { b.raidsCount = Number(r.count); b.raidViewers = Number(r.total ?? 0) }
    }
    for (const r of superchatsByDay) {
      const b = dayMap.get(dayKey(r.day))
      if (b) { b.superchatsCount = Number(r.count); b.superchatsTotal = Number(r.total ?? 0) / 1_000_000 }
    }
    for (const r of membersByDay) {
      const b = dayMap.get(dayKey(r.day)); if (b) b.members = Number(r.count)
    }

    const byDay = Array.from(dayMap.values())

    // ── Per-session totals (4 left joins, one per event type) ────────────────
    const COALESCE_NOW = sql`COALESCE(${streamSessions.endedAt}, NOW())`

    const [sessionFollows, sessionSubs, sessionBits, sessionRaids] = hasTwitch && sessionRows.length > 0
      ? await Promise.all([
          db.select({ sessionId: streamSessions.id, count: count(followEvents.id) })
            .from(streamSessions)
            .leftJoin(followEvents, and(
              eq(followEvents.broadcasterId, streamSessions.broadcasterId),
              gte(followEvents.occurredAt, streamSessions.startedAt),
              lte(followEvents.occurredAt, COALESCE_NOW),
            ))
            .where(and(eq(streamSessions.broadcasterId, broadcasterId), gte(streamSessions.startedAt, since)))
            .groupBy(streamSessions.id),

          db.select({ sessionId: streamSessions.id, count: count(subEvents.id) })
            .from(streamSessions)
            .leftJoin(subEvents, and(
              eq(subEvents.broadcasterId, streamSessions.broadcasterId),
              gte(subEvents.occurredAt, streamSessions.startedAt),
              lte(subEvents.occurredAt, COALESCE_NOW),
            ))
            .where(and(eq(streamSessions.broadcasterId, broadcasterId), gte(streamSessions.startedAt, since)))
            .groupBy(streamSessions.id),

          db.select({ sessionId: streamSessions.id, total: sum(cheerEvents.bits) })
            .from(streamSessions)
            .leftJoin(cheerEvents, and(
              eq(cheerEvents.broadcasterId, streamSessions.broadcasterId),
              gte(cheerEvents.occurredAt, streamSessions.startedAt),
              lte(cheerEvents.occurredAt, COALESCE_NOW),
            ))
            .where(and(eq(streamSessions.broadcasterId, broadcasterId), gte(streamSessions.startedAt, since)))
            .groupBy(streamSessions.id),

          db.select({ sessionId: streamSessions.id, total: sum(raidEvents.viewerCount) })
            .from(streamSessions)
            .leftJoin(raidEvents, and(
              eq(raidEvents.broadcasterId, streamSessions.broadcasterId),
              gte(raidEvents.occurredAt, streamSessions.startedAt),
              lte(raidEvents.occurredAt, COALESCE_NOW),
            ))
            .where(and(eq(streamSessions.broadcasterId, broadcasterId), gte(streamSessions.startedAt, since)))
            .groupBy(streamSessions.id),
        ])
      : [[], [], [], []]

    const followMap = new Map(sessionFollows.map(r => [r.sessionId, Number(r.count)]))
    const subMap    = new Map(sessionSubs.map(r => [r.sessionId, Number(r.count)]))
    const bitsMap   = new Map(sessionBits.map(r => [r.sessionId, Number(r.total ?? 0)]))
    const raidMap   = new Map(sessionRaids.map(r => [r.sessionId, Number(r.total ?? 0)]))

    // ── Build sessions ────────────────────────────────────────────────────────
    const sessions: AnalyticsSession[] = sessionRows.map(s => ({
      id: s.id,
      startedAt: s.startedAt.toISOString(),
      endedAt: s.endedAt?.toISOString() ?? null,
      durationMinutes: s.endedAt
        ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000)
        : null,
      summary: {
        follows: followMap.get(s.id) ?? 0,
        subs:    subMap.get(s.id)    ?? 0,
        bits:    bitsMap.get(s.id)   ?? 0,
        raids:   raidMap.get(s.id)   ?? 0,
      },
    }))

    return { totals, byDay, sessions }
  }

  async getSessionDetail(sessionId: string, broadcasterId: string): Promise<SessionDetail | null> {
    const sessionRows = await db.select().from(streamSessions)
      .where(and(eq(streamSessions.id, sessionId), eq(streamSessions.broadcasterId, broadcasterId)))
      .limit(1)

    const session = sessionRows[0]
    if (!session) return null

    const { startedAt } = session
    const windowEnd = session.endedAt ?? new Date()

    const [follows, subs, cheers, raids] = await Promise.all([
      db.select().from(followEvents)
        .where(and(eq(followEvents.broadcasterId, broadcasterId), gte(followEvents.occurredAt, startedAt), lte(followEvents.occurredAt, windowEnd)))
        .orderBy(asc(followEvents.occurredAt)),
      db.select().from(subEvents)
        .where(and(eq(subEvents.broadcasterId, broadcasterId), gte(subEvents.occurredAt, startedAt), lte(subEvents.occurredAt, windowEnd)))
        .orderBy(asc(subEvents.occurredAt)),
      db.select().from(cheerEvents)
        .where(and(eq(cheerEvents.broadcasterId, broadcasterId), gte(cheerEvents.occurredAt, startedAt), lte(cheerEvents.occurredAt, windowEnd)))
        .orderBy(asc(cheerEvents.occurredAt)),
      db.select().from(raidEvents)
        .where(and(eq(raidEvents.broadcasterId, broadcasterId), gte(raidEvents.occurredAt, startedAt), lte(raidEvents.occurredAt, windowEnd)))
        .orderBy(asc(raidEvents.occurredAt)),
    ])

    const events: LiveEvent[] = [
      ...follows.map(mapFollowToEvent),
      ...subs.map(mapSubToEvent),
      ...cheers.map(mapCheerToEvent),
      ...raids.map(mapRaidToEvent),
    ].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())

    const totals: AnalyticsTotals = {
      follows: follows.length,
      subs: subs.length,
      bits: { count: cheers.length, total: cheers.reduce((acc, e) => acc + e.bits, 0) },
      raids: { count: raids.length, total: raids.reduce((acc, e) => acc + e.viewerCount, 0) },
      superchats: { count: 0, byCurrency: {} },
      members: 0,
    }

    return {
      session: {
        id: session.id,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt?.toISOString() ?? null,
        durationMinutes: session.endedAt
          ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
          : null,
        summary: {
          follows: follows.length,
          subs: subs.length,
          bits: cheers.reduce((acc, e) => acc + e.bits, 0),
          raids: raids.reduce((acc, e) => acc + e.viewerCount, 0),
        },
      },
      totals,
      events,
    }
  }
}

export const analyticsService = new AnalyticsService()
