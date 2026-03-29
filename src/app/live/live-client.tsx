"use client"
import { TYPE_BADGE, TYPE_ICON } from "@/lib/event-types"
import { useStreamEvents } from "@/hooks/use-stream-events"
import { ReplayButton } from "@/components/replay-button"
import type { LiveEvent } from "@/types/events"
import {AppHeader} from "@/app/dashboard/app-header";
import {SpotifyPlayer} from "@/app/live/spotify-player";
import {GoalBar} from "@/app/live/goal-bar";
import {LiveBadge} from "@/app/live/live-badge";
import {GoalBarProps} from "@/props/goal-bar.props";
import {formatUptime} from "@/lib/format";

export function LiveClient({
  displayName, hasYouTube, hasSpotify, streamInfo, initialEvents,
  subGoal, subTotal, followGoal, followTotal, ytMemberGoal, ytMemberTotal,
}: GoalBarProps) {
  const events: LiveEvent[] = useStreamEvents(initialEvents)
  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <AppHeader displayName={displayName} />

      {/* Status bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 flex items-center gap-4 shrink-0">
        <LiveBadge isLive={streamInfo.isLive} />
        {streamInfo.isLive && streamInfo.startedAt && <span> {formatUptime(streamInfo.startedAt)} </span>}
        {streamInfo.viewerCount !== null && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {streamInfo.viewerCount.toLocaleString()} viewers
          </span>
        )}
        {!streamInfo.isLive && (
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            Start streaming on Twitch to see live stats here
          </span>
        )}
      </div>

      {/* Main layout */}
      <div className="flex-1 flex min-h-0">

        {/* Left — Now Playing + Chat */}
        <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 min-h-0">

          {/* Spotify mini player */}
          <div className="shrink-0 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
            <SpotifyPlayer hasSpotify={hasSpotify} />
          </div>

          {/* Chat header */}
          <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Unified Chat
            </h2>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-medium">Twitch</span>
              {hasYouTube && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">YouTube</span>}
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg">
              💬
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Unified chat coming soon</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                Twitch {hasYouTube ? "and YouTube " : ""}chat will appear here in real time
              </p>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-80 shrink-0 flex flex-col min-h-0 divide-y divide-zinc-200 dark:divide-zinc-800">

          {/* Stream info */}
          <div className="p-4 space-y-3 shrink-0">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Stream Info</h2>
            {streamInfo.isLive ? (
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Title</p>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">
                    {streamInfo.title ?? <span className="italic text-zinc-400">No title</span>}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-600 uppercase tracking-wider mb-0.5">Category</p>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">
                    {streamInfo.category ?? <span className="italic text-zinc-400">No category</span>}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">No active stream</p>
            )}
          </div>

          {/* Goals */}
          <div className="p-5 space-y-4 shrink-0">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Goals</h2>
            {!subGoal && !followGoal && !ytMemberGoal ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">No active goals</p>
            ) : (
              <div className="space-y-4">
                {subGoal && (
                  <GoalBar label="Subscribers" current={subTotal} goal={subGoal.goal} />
                )}
                {followGoal && (
                  <GoalBar label="Followers" current={followTotal} goal={followGoal.goal} />
                )}
                {ytMemberGoal && (
                  <GoalBar label="YT Members" current={ytMemberTotal} goal={ytMemberGoal.goal} />
                )}
              </div>
            )}
          </div>

          {/* Recent events */}
          <div className="flex-1 flex flex-col min-h-0 p-4 gap-2">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider shrink-0">Recent Events</h2>
            {events.length === 0 ? (
              <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">No events yet</p>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-1.5">
                {events.map(event => (
                  <div key={event.id} className="flex items-center gap-2 group">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${TYPE_BADGE[event.type]}`}>
                      {TYPE_ICON[event.type]}
                    </span>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 truncate flex-1">{event.fromUser}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-600 shrink-0 tabular-nums">
                      {new Date(event.occurredAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <ReplayButton event={event} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
