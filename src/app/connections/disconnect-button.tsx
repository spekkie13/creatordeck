"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import type { DisconnectButtonProps } from "@/props/disconnect-button.props"

export function DisconnectButton({ provider }: DisconnectButtonProps) {
  const { update } = useSession()
  const router: AppRouterInstance = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function disconnect() {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/connections/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    })
    if (res.ok) {
      await update()
      router.refresh()
    } else {
      const text = await res.text()
      setError(text)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={disconnect}
        disabled={loading}
        className="text-xs text-zinc-500 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg hover:border-red-300 hover:text-red-500 dark:hover:border-red-800 dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Disconnecting..." : "Disconnect"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
