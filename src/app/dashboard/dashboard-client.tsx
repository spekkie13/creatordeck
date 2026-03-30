"use client"

import Link from "next/link"

import type { LiveEvent, LiveEventType } from "@/types/events"

import { STATUS_CONFIG } from "@/constants/dashboard"
import type { PlatformStatusInfo, StatusInfo, StatusVariant } from "@/constants/dashboard"
import { TYPE_BADGE, TYPE_ICON } from "@/lib/event-types"
import { formatAmount, formatCount, greeting } from "@/lib/format"

import { useStreamEvents } from "@/hooks/use-stream-events"

import { TwitchLogo, YouTubeLogo } from "@/components/platform-logos"

import type { DashboardProps } from "@/props/dashboard.props"
import { AppHeader } from "@/app/dashboard/app-header"

export function DashboardClient({
  session, goal, initialCount, endsAt, total, initialEvents,
  subscriptionsRegistered, followerCount, subCount, ytSubCount,
  hasYouTube, followerGrowth, subGrowth, followTotal, followGoal,
  ytMemberTotal, ytMemberGoal, twitchIsLive, ytIsLive, ytLiveTitle,
}: DashboardProps) {
  const events: LiveEvent[] = useStreamEvents(initialEvents)

  const displayTotal: number = total + initialCount
  const progress: number = Math.min((displayTotal / goal) * 100, 100)

  const hasTwitch: boolean = !!session.twitchId
  const twitchStatus: PlatformStatusInfo = !hasTwitch
    ? { dot: "bg-zinc-400 dark:bg-zinc-600", text: "text-zinc-400 dark:text-zinc-500", label: "Not connected" }
    : !subscriptionsRegistered
    ? { dot: "bg-amber-500", text: "text-amber-500", label: "Action required" }
    : { dot: "bg-green-500", text: "text-green-500", label: "Connected" }
  const ytStatus: PlatformStatusInfo = hasYouTube
    ? { dot: "bg-green-500", text: "text-green-500", label: "Connected" }
    : { dot: "bg-zinc-400 dark:bg-zinc-600", text: "text-zinc-400 dark:text-zinc-500", label: "Not connected" }

  const allGood: boolean = hasTwitch && subscriptionsRegistered
  const variant: StatusVariant = allGood ? "good" : "warning"
  const s: StatusInfo = STATUS_CONFIG[variant]

  void endsAt // tracked server-side

  return (
    <div className="min-h-screen">
      <AppHeader displayName={session.displayName} />

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Welcome card — with platform status integrated */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-6 py-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight">
                {greeting()}, <span className="text-teal-500">{session.displayName}</span> 👋
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{s.subtext}</p>
            </div>
            <span className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border shrink-0 self-start sm:self-auto ${s.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <TwitchLogo className={`w-3.5 h-3.5 ${hasTwitch ? "text-[#9146FF]" : "text-zinc-400 dark:text-zinc-600"}`} />
                <span className="text-sm font-medium">Twitch</span>
                {twitchIsLive ? (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-500 animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 text-xs ${twitchStatus.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${twitchStatus.dot}`} />
                    {twitchStatus.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <YouTubeLogo className={`w-3.5 h-3.5 ${hasYouTube ? "text-[#FF0000]" : "text-zinc-400 dark:text-zinc-600"}`} />
                <span className="text-sm font-medium">YouTube</span>
                {ytIsLive ? (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium" title={ytLiveTitle ?? undefined}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block bg-red-500 animate-pulse" />
                    Live
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 text-xs ${ytStatus.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${ytStatus.dot}`} />
                    {ytStatus.label}
                  </span>
                )}
              </div>
            </div>
            <Link href="/connections" className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0">
              Manage →
            </Link>
          </div>
        </div>


        {/* Setup banner */}
        {!subscriptionsRegistered && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-500 text-base mt-0.5">⚠</span>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Setup required</p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
                Register your Twitch EventSub subscriptions to start receiving live events.{" "}
                <Link href="/connections" className="underline hover:no-underline">Go to Connections →</Link>
              </p>
            </div>
          </div>
        )}

        {/* Audience pills */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <TwitchLogo className="w-3.5 h-3.5 text-[#9146FF]" />
              Followers
            </div>
            <p className="text-2xl font-bold">{formatCount(followerCount)}</p>
            <p className={`text-xs ${followerGrowth > 0 ? "text-green-500" : "text-zinc-400 dark:text-zinc-600"}`}>
              {followerGrowth > 0 ? `+${followerGrowth.toLocaleString()}` : "—"} last 30d
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <TwitchLogo className="w-3.5 h-3.5 text-[#9146FF]" />
              Subscribers
            </div>
            <p className="text-2xl font-bold">{formatCount(subCount)}</p>
            <p className={`text-xs ${subGrowth > 0 ? "text-green-500" : "text-zinc-400 dark:text-zinc-600"}`}>
              {subGrowth > 0 ? `+${subGrowth.toLocaleString()}` : "—"} last 30d
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <YouTubeLogo className="w-3.5 h-3.5 text-[#FF0000]" />
              Subscribers
            </div>
            <p className="text-2xl font-bold">{formatCount(hasYouTube ? ytSubCount : null)}</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-600">Live count</p>
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-6 pt-4 pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Goals</h2>
            <Link href="/goals" className="text-xs text-teal-500 hover:text-teal-400 transition-colors">
              Manage →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Twitch follow goal */}
            {followGoal !== null ? (() => {
              const followProgress = Math.min((followTotal / followGoal) * 100, 100)
              return (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <TwitchLogo className="w-3.5 h-3.5 text-[#9146FF]" />
                    Twitch Followers
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold">{followTotal.toLocaleString()}</span>
                    <span className="text-sm text-zinc-400 dark:text-zinc-500">/ {followGoal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${followProgress}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500">{followProgress.toFixed(1)}%</p>
                </div>
              )
            })() : (
              /* No goal set */
              <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  <TwitchLogo className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
                  Twitch Followers
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">No follow goal set.</p>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2" />
                <Link href="/goals" className="text-xs text-teal-500 hover:text-teal-400 transition-colors">Set a goal →</Link>
              </div>
            )}

            {/* Twitch sub goal — always active */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <TwitchLogo className="w-3.5 h-3.5 text-[#9146FF]" />
                Twitch Subscribers
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold">{displayTotal.toLocaleString()}</span>
                <span className="text-sm text-zinc-400 dark:text-zinc-500">/ {goal.toLocaleString()}</span>
              </div>
              <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                <div className="bg-teal-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-zinc-500">{progress.toFixed(1)}%</p>
            </div>

            {/* YouTube member goal */}
            {!hasYouTube ? (
              /* Not connected — amber tint */
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-700/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  <YouTubeLogo className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
                  YouTube Members
                </div>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">YouTube not connected</p>
                <div className="w-full bg-amber-100 dark:bg-amber-900/20 rounded-full h-2" />
                <Link href="/connections" className="text-xs text-teal-500 hover:text-teal-400 transition-colors">Connect account →</Link>
              </div>
            ) : ytMemberGoal !== null ? (() => {
              const memberProgress = Math.min((ytMemberTotal / ytMemberGoal) * 100, 100)
              return (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <YouTubeLogo className="w-3.5 h-3.5 text-[#FF0000]" />
                    YouTube Members
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold">{ytMemberTotal.toLocaleString()}</span>
                    <span className="text-sm text-zinc-400 dark:text-zinc-500">/ {ytMemberGoal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${memberProgress}%` }} />
                  </div>
                  <p className="text-xs text-zinc-500">{memberProgress.toFixed(1)}%</p>
                </div>
              )
            })() : (
              /* Connected but no goal set */
              <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                  <YouTubeLogo className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
                  YouTube Members
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">No member goal set.</p>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2" />
                <Link href="/goals" className="text-xs text-teal-500 hover:text-teal-400 transition-colors">Set a goal →</Link>
              </div>
            )}

          </div>
        </div>

        {/* Live event feed */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Live Feed</h2>
              <span className="flex items-center gap-1.5 text-xs text-green-500">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </span>
            </div>
            <Link href="/events" className="text-xs text-teal-500 hover:text-teal-400 transition-colors">
              View all events →
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">
              Waiting for events... Subs, follows, bits and raids will appear here in real time.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
              {events.map(event => (
                <div key={event.id} className="px-6 py-3 flex items-center gap-4">
                  {event.platform === "youtube"
                    ? <YouTubeLogo className="shrink-0 w-3 h-3 text-[#FF0000]" />
                    : <TwitchLogo className="shrink-0 w-3 h-3 text-[#9146FF]" />
                  }
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${TYPE_BADGE[event.type as LiveEventType]}`}>
                    {TYPE_ICON[event.type as LiveEventType]} {event.type}
                  </span>
                  <span className="flex-1 text-sm truncate">{event.fromUser}</span>
                  {event.amount !== null && (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
                      {formatAmount(event.type as LiveEventType, event.amount, event.currency)}
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 dark:text-zinc-600 shrink-0">
                    {new Date(event.occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
