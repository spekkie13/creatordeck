"use client"
import { AppHeader } from "@/app/dashboard/app-header"
import { TYPE_BADGE, TYPE_ICON } from "@/lib/event-types"
import { useStreamEvents } from "@/hooks/use-stream-events"
import {TwitchChatMessage, useTwitchChat} from "@/hooks/use-twitch-chat"
import { ReplayButton } from "@/components/replay-button"
import { TwitchLogo, YouTubeLogo } from "@/components/platform-logos"
import {GoalBarProps} from "@/props/goal-bar.props";
import {SpotifyPlayer} from "@/app/live/spotify-player";
import {GoalBar} from "@/app/live/goal-bar";
import {LiveBadge} from "@/app/live/live-badge";
import {formatUptime} from "@/lib/format";
import {LiveEvent} from "@/types/events";

export function LiveClient({
  displayName, twitchLogin, hasYouTube, hasSpotify, streamInfo, initialEvents,
  subGoal, subTotal, followGoal, followTotal, ytMemberGoal, ytMemberTotal,
}: GoalBarProps) {
  const events: LiveEvent[] = useStreamEvents(initialEvents)
  const chatMessages: TwitchChatMessage[] = useTwitchChat(twitchLogin)
  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <AppHeader displayName={displayName} />

      {/* Status bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 flex items-center gap-4 shrink-0">
        <LiveBadge isLive={streamInfo.isLive} />
        {streamInfo.isLive && streamInfo.startedAt && <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatUptime(streamInfo.startedAt)}</span>}
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
          <div className="shrink-0 h-36 px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800">
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
          <div className="flex-1 overflow-y-auto flex flex-col-reverse px-4 py-2 gap-1">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-600 italic text-center py-8">
                No messages yet — chat will appear here in real time
              </p>
            ) : (
              [...chatMessages].reverse().map(msg => (
                <div key={msg.id} className="flex items-baseline gap-2 py-0.5">
                  {msg.platform === "youtube"
                    ? <YouTubeLogo className="w-3.5 h-3.5 shrink-0 text-[#FF0000] self-center" />
                    : <TwitchLogo className="w-3.5 h-3.5 shrink-0 text-[#9146FF] self-center" />
                  }
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">{msg.userDisplayName}</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400 break-words min-w-0">{msg.message}</span>
                </div>
              ))
            )}
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
