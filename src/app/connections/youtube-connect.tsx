"use client"

export function YouTubeConnectButton({ retry, locked }: { retry?: boolean; locked?: boolean }) {
  if (locked) {
    return (
      <a
        href="/billing"
        title="YouTube is a Pro feature — upgrade to connect"
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-teal-600 dark:hover:text-teal-400 border border-zinc-200 dark:border-zinc-800 hover:border-teal-500/50 px-3 py-1.5 rounded-lg transition-colors select-none"
      >
        <span aria-hidden>🔒</span> Pro
      </a>
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
