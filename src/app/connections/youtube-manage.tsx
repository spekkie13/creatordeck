type Props = {
  channelId: string
  displayName: string
  avatarUrl?: string | null
  isPollerActive: boolean
  needsReconnect?: boolean
}

export function YouTubeManage({ channelId, displayName, avatarUrl, isPollerActive, needsReconnect }: Props) {
  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-4 space-y-3">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-full shrink-0"
          />
        ) : null}
        <span className="text-sm font-medium text-zinc-900 dark:text-white">{displayName}</span>
      </div>

      {needsReconnect ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
          <span className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-amber-500" />
            Reconnect required — your YouTube authorization expired.
          </span>
          <a
            href="/api/connections/link/google/start"
            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Reconnect
          </a>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Live chat
          </span>
          <span className={`flex items-center gap-1.5 text-xs ${isPollerActive ? "text-green-500" : "text-zinc-400 dark:text-zinc-600"}`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${isPollerActive ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
            {isPollerActive ? "Live — broadcast in progress" : "Not currently live"}
          </span>
        </div>
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        YouTube chat is live while CreatorDeck is open.
      </p>

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
            className="text-xs text-teal-500 hover:text-teal-400 transition-colors"
          >
            Open →
          </a>
        </div>
      </div>
    </div>
  )
}
