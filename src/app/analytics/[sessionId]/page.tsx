import {getServerSession, Session} from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {analyticsService, SessionDetail} from "@/services"
import { AppHeader } from "@/app/dashboard/app-header"
import type { LiveEventType } from "@/types/events"
import { SessionTimeline } from "./session-timeline"
import {TotalsRow} from "@/app/analytics/[sessionId]/TotalsRow";
import {formatDuration} from "@/lib/format";

export default async function SessionDetailPage({ params }: { params: { sessionId: string } }) {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")
  if (!session.twitchId) redirect("/analytics")

  const detail: SessionDetail | null = await analyticsService.getSessionDetail(params.sessionId, session.twitchId)
  if (!detail) notFound()

  const { session: s, totals, events } = detail
  const startDate = new Date(s.startedAt)
  const endDate: Date | null = s.endedAt ? new Date(s.endedAt) : null

  const presentTypes = Array.from(new Set(events.map(e => e.type))) as LiveEventType[]

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AppHeader displayName={session.displayName} />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Back link */}
        <Link href="/analytics" className="inline-block text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
          ← Back to Analytics
        </Link>

        {/* Session header card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">
            {startDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </h1>
          <p className="text-sm text-zinc-400 dark:text-zinc-500 tabular-nums mt-1">
            {startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            {" – "}
            {endDate
              ? endDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
              : "ongoing"}
            {" · "}
            {formatDuration(s.durationMinutes, "Ongoing")}
            {" · "}
            <span>{events.length} events</span>
          </p>
        </div>

        {/* Totals */}
        <TotalsRow totals={totals} />

        {/* Event timeline */}
        <SessionTimeline events={events} sessionStart={s.startedAt} presentTypes={presentTypes} />

      </main>
    </div>
  )
}
