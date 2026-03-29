"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { TYPE_BADGE, TYPE_ICON } from "@/lib/event-types"
import { useStreamEvents } from "@/hooks/use-stream-events"
import { ReplayButton } from "@/components/replay-button"
import type { LiveEvent } from "@/types/events"
import {StreamInfo} from "@/types/stream";
import {AppHeader} from "@/app/dashboard/app-header";

type NowPlaying = {
  isPlaying: boolean
  track: string
  artist: string
  albumArt: string | null
  progress: number
  duration: number
} | null

type QueueTrack = {
  track: string
  artist: string
  albumArt: string | null
}

type SubGoal = { goal: number; initialCount: number; endsAt: string | null }
type SimpleGoal = { goal: number }

type Props = {
  displayName: string
  hasYouTube: boolean
  hasSpotify: boolean
  streamInfo: StreamInfo
  initialEvents: LiveEvent[]
  subGoal: SubGoal | null
  subTotal: number
  followGoal: SimpleGoal | null
  followTotal: number
  ytMemberGoal: SimpleGoal | null
  ytMemberTotal: number
}

function GoalBar({ label, current, goal }: { label: string; current: number; goal: number }) {
  const pct = Math.min(100, Math.round((current / goal) * 100))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span>{current} / {goal}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function LiveBadge({ isLive }: { isLive: boolean }) {
  if (!isLive) return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500">
      <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
      Offline
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-red-500">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      Live
    </span>
  )
}

function Uptime({ startedAt }: { startedAt: string }) {
  const started = new Date(startedAt)
  const now = new Date()
  const mins = Math.floor((now.getTime() - started.getTime()) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return <span className="text-xs text-zinc-500 dark:text-zinc-400">{h}h {m}m</span>
}

function SpotifyPlayer({ hasSpotify }: { hasSpotify: boolean }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null)
  const [queue, setQueue] = useState<QueueTrack[]>([])
  const [progressMs, setProgressMs] = useState(0)
  const progressRef = useRef(progressMs)
  progressRef.current = progressMs

  useEffect(() => {
    if (!hasSpotify) return
    const poll = async () => {
      try {
        const [npRes, qRes] = await Promise.all([
          fetch("/api/spotify/now-playing"),
          fetch("/api/spotify/queue"),
        ])
        const data: NowPlaying = await npRes.json()
        setNowPlaying(data)
        if (data) setProgressMs(data.progress)
        const qData: QueueTrack[] = await qRes.json()
        setQueue(qData)
      } catch { /* silent */ }
    }
    poll()
    const interval = setInterval(poll, 10_000)
    return () => clearInterval(interval)
  }, [hasSpotify])

  // Tick progress locally every second when playing
  useEffect(() => {
    if (!nowPlaying?.isPlaying) return
    const tick = setInterval(() => {
      setProgressMs(p => Math.min(p + 1000, nowPlaying.duration))
    }, 1000)
    return () => clearInterval(tick)
  }, [nowPlaying?.isPlaying, nowPlaying?.duration])

  async function control(action: string, volume?: number) {
    await fetch("/api/spotify/controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(volume !== undefined ? { action, volume } : { action }),
    })
    // Optimistic toggle for play/pause
    if (action === "play" || action === "pause") {
      setNowPlaying(prev => prev ? { ...prev, isPlaying: action === "play" } : prev)
    }
  }

  if (!hasSpotify) {
    return (
      <div className="w-[340px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm">🎵</div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">Spotify not connected</p>
          <Link href="/connections" className="text-[10px] text-purple-500 hover:text-purple-400">Connect in Settings →</Link>
        </div>
      </div>
    )
  }

  if (!nowPlaying) {
    return (
      <div className="w-[340px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm">🎵</div>
        <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">Not playing</p>
      </div>
    )
  }

  const pct = nowPlaying.duration > 0 ? (progressMs / nowPlaying.duration) * 100 : 0

  return (
    <div className="flex items-start gap-3">
      {/* Now playing */}
      <div className="w-[340px] shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 space-y-2">
        <div className="flex items-center gap-2.5">
          {nowPlaying.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nowPlaying.albumArt} alt="" className="w-8 h-8 rounded shrink-0 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm">🎵</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{nowPlaying.track}</p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{nowPlaying.artist}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => control("previous")} title="Previous" className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm leading-none transition-colors">⏮</button>
            <button onClick={() => control(nowPlaying.isPlaying ? "pause" : "play")} title={nowPlaying.isPlaying ? "Pause" : "Play"} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-lg leading-none transition-colors">
              {nowPlaying.isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={() => control("skip")} title="Next" className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm leading-none transition-colors">⏭</button>
          </div>
        </div>
        <div className="h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
          <div className="h-full rounded-full bg-[#1DB954] transition-none" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 space-y-1.5 min-w-0">
          <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">Up next</p>
          {queue.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.albumArt ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.albumArt} alt="" className="w-6 h-6 rounded shrink-0 object-cover" />
              ) : (
                <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-zinc-700 dark:text-zinc-300 truncate leading-tight">{item.track}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-600 truncate leading-tight">{item.artist}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LiveClient({
  displayName, hasYouTube, hasSpotify, streamInfo, initialEvents,
  subGoal, subTotal, followGoal, followTotal, ytMemberGoal, ytMemberTotal,
}: Props) {
  const events = useStreamEvents(initialEvents)
  return (
    <div className="fixed inset-0 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      <AppHeader displayName={displayName} />

      {/* Status bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-2.5 flex items-center gap-4 shrink-0">
        <LiveBadge isLive={streamInfo.isLive} />
        {streamInfo.isLive && streamInfo.startedAt && <Uptime startedAt={streamInfo.startedAt} />}
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
