"use client"

import { useState } from "react"

export function StreamElementsConnectButton({ retry }: { retry?: boolean }) {
  const [open, setOpen] = useState(retry ?? false)
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/connections/link/streamelements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jwtToken: token }),
    })

    if (res.ok) {
      window.location.reload()
    } else {
      const data = await res.json().catch(() => ({}))
      setError((data as { error?: string }).error ?? "Failed to connect")
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        Connect
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 items-end">
      <input
        type="text"
        value={token}
        onChange={e => setToken(e.target.value)}
        placeholder="Paste JWT token from SE dashboard"
        className="text-xs border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 w-64 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400"
        autoFocus
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2 py-1.5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !token.trim()}
          className="text-xs bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {loading ? "Connecting…" : "Connect"}
        </button>
      </div>
    </form>
  )
}