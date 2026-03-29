import {LiveEvent} from "@/types/events";

export type AnalyticsTotals = {
    follows: number
    subs: number
    bits: { count: number; total: number }
    raids: { count: number; total: number }
    superchats: { count: number; byCurrency: Record<string, number> }
    members: number
}

export type DayBucket = {
    date: string
    // Activity tab (counts)
    follows: number
    subs: number
    bitsCount: number
    raidsCount: number
    superchatsCount: number
    members: number
    // Revenue tab (amounts)
    bitsTotal: number
    raidViewers: number
    superchatsTotal: number // sum of amountMicros/1M — approximate if multi-currency
}

export type SessionSummary = {
    follows: number
    subs: number
    bits: number   // total bits
    raids: number  // total viewers
}

export type AnalyticsSession = {
    id: string
    startedAt: string
    endedAt: string | null
    durationMinutes: number | null
    summary: SessionSummary
}

export type AnalyticsOverview = {
    totals: AnalyticsTotals
    byDay: DayBucket[]
    sessions: AnalyticsSession[]
}

export type SessionDetail = {
    session: AnalyticsSession
    totals: AnalyticsTotals
    events: LiveEvent[]
}
