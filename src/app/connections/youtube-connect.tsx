"use client"

export function YouTubeConnectButton({ retry, locked }: { retry?: boolean; locked?: boolean }) {
  if (locked) {
    return (
      <span
        title="YouTube is a Pro feature — coming soon"
        className="flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg cursor-not-allowed select-none"
      >
        <span aria-hidden>🔒</span> Pro
      </span>
    )
  }

  return (
    <a
      href="/api/connections/link/google/start"
      className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg transition-colors"
    >
      {retry ? "Try again" : "Connect"}
    </a>
  )
}
