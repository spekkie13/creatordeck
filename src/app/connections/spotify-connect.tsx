"use client"

export function SpotifyConnectButton({ retry }: { retry?: boolean }) {
  return (
    <a
      href="/api/connections/link/spotify/start"
      className="text-xs bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg transition-colors"
    >
      {retry ? "Try again" : "Connect"}
    </a>
  )
}
