import {useEffect, useState} from "react";
import {NowPlaying, QueueTrack} from "@/types/spotify";
import Link from "next/link";

export function SpotifyPlayer({ hasSpotify }: { hasSpotify: boolean }) {
    const [nowPlaying, setNowPlaying] = useState<NowPlaying>(null)
    const [queue, setQueue] = useState<QueueTrack[]>([])

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
                const qData: QueueTrack[] = await qRes.json()
                setQueue(qData)
            } catch { /* silent */ }
        }
        poll()
        const interval = setInterval(poll, 10_000)
        return () => clearInterval(interval)
    }, [hasSpotify])

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
            <div className="w-[340px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 space-y-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm">🎵</div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">Spotify not connected</p>
                        <Link href="/connections" className="text-[10px] text-purple-500 hover:text-purple-400">Connect in Settings →</Link>
                    </div>
                </div>
                <div className="h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden" />
            </div>
        )
    }

    if (!nowPlaying) {
        return (
            <div className="w-[340px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 space-y-2">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm">🎵</div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 italic">Not playing</p>
                </div>
                <div className="h-1 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden" />
            </div>
        )
    }

    return (
        <div className="flex items-start gap-3">
            {/* Now playing */}
            <div className="w-[340px] shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2.5">
                    {nowPlaying.albumArt ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={nowPlaying.albumArt} alt="" className="w-6 h-6 rounded shrink-0 object-cover" />
                    ) : (
                        <div className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-sm">🎵</div>
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
            </div>

            {/* Queue */}
            {queue.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 min-w-0 flex-1 overflow-hidden">
                    <div className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {queue.map((item, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 shrink-0 w-14">
                                {item.albumArt ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.albumArt} alt="" className="w-6 h-6 rounded shrink-0 object-cover" />
                                ) : (
                                    <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-800 shrink-0" />
                                )}
                                <p className="text-[10px] text-zinc-700 dark:text-zinc-300 truncate w-full text-center leading-tight">{item.track}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
