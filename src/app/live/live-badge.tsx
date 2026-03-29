export function LiveBadge({ isLive }: { isLive: boolean }) {
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
