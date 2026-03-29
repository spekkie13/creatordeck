type Props = {
  channelId: string
  displayName: string
  isPollerActive: boolean
}

export function YouTubeManage({ channelId, displayName, isPollerActive }: Props) {
  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Live chat poller
        </span>
        <span className={`flex items-center gap-1.5 text-xs ${isPollerActive ? "text-green-500" : "text-zinc-400 dark:text-zinc-600"}`}>
          <span className={`w-1.5 h-1.5 rounded-full inline-block ${isPollerActive ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
          {isPollerActive ? "Active — stream in progress" : "Inactive — not currently live"}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Channel</span>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded">
            {channelId}
          </code>
          <a
            href={`https://youtube.com/channel/${channelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-500 hover:text-purple-400 transition-colors"
          >
            Open →
          </a>
        </div>
      </div>
    </div>
  )
}
