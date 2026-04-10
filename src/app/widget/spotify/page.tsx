"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"

import type { NowPlaying, QueueTrack } from "@/types/spotify"

export default function SpotifyWidget() {
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const showQueue = params.get("queue") !== "0"

  const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null)
  const [queue, setQueue] = useState<QueueTrack[]>([])
  const [progressMs, setProgressMs] = useState(0)
  const progressRef = useRef(progressMs)
  progressRef.current = progressMs

  useEffect(() => {
    document.documentElement.style.setProperty("background-color", "transparent", "important")
    document.body.style.setProperty("background-color", "transparent", "important")
  }, [])

  const poll = useCallback(async () => {
    if (!token) return
    try {
      const [npRes, qRes] = await Promise.all([
        fetch(`/api/widget/spotify/now-playing?token=${token}`),
        showQueue ? fetch(`/api/widget/spotify/queue?token=${token}`) : Promise.resolve(null),
      ])
      const data: NowPlaying = await npRes.json()
      setNowPlaying(data)
      if (data) setProgressMs(data.progress)
      if (qRes) {
        const qData: QueueTrack[] = await qRes.json()
        setQueue(qData)
      }
    } catch { /* silent */ }
  }, [token, showQueue])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 10_000)
    return () => clearInterval(interval)
  }, [poll])

  // Tick progress locally every second when playing
  useEffect(() => {
    if (!nowPlaying?.isPlaying) return
    const tick = setInterval(() => {
      setProgressMs(p => Math.min(p + 1000, nowPlaying.duration))
    }, 1000)
    return () => clearInterval(tick)
  }, [nowPlaying?.isPlaying, nowPlaying?.duration])

  if (!token || !nowPlaying) return null

  return (
    <div className="flex items-start gap-3 p-2">
      {/* Now playing */}
      <div className="w-[340px] shrink-0 bg-black/60 backdrop-blur rounded-lg px-3 py-2 space-y-2">
        <div className="flex items-center gap-2.5">
          {nowPlaying.albumArt ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={nowPlaying.albumArt} alt="" className="w-8 h-8 rounded shrink-0 object-cover" />
          ) : (
            <div className="w-8 h-8 rounded bg-white/10 shrink-0 flex items-center justify-center text-sm">♪</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              {nowPlaying.track}
            </p>
            <p className="text-[10px] text-white/70 truncate">{nowPlaying.artist}</p>
          </div>
          {/* Spotify green dot = playing indicator */}
          {nowPlaying.isPlaying && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954] shrink-0 animate-pulse" />
          )}
        </div>
        <div className="h-1 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1DB954] transition-none"
            style={{ width: `${Math.min(100, (progressMs / nowPlaying.duration) * 100)}%` }}
          />
        </div>
      </div>

      {/* Queue */}
      {showQueue && queue.length > 0 && (
        <div className="w-[480px] bg-black/60 backdrop-blur rounded-lg px-3 py-2 overflow-hidden">
          <div className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {queue.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-1 shrink-0 w-16">
                {item.albumArt ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.albumArt} alt="" className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/10 shrink-0" />
                )}
                <p className="text-[9px] text-white/70 truncate w-full text-center leading-tight">{item.track}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}