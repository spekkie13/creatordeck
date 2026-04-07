"use client"

export function StreamElementsConnectButton({ retry }: { retry?: boolean }) {
  return (
    <a
      href="/api/connections/link/streamelements/start"
      className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-colors"
    >
      {retry ? "Try again" : "Connect"}
    </a>
  )
}
