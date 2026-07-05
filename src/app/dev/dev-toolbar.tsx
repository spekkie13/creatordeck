"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

const OPTIONS = [
  { label: "Free", isAdmin: false },
  { label: "Pro (owner)", isAdmin: true },
] as const

export function DevToolbar() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState<boolean | null>(null)

  async function setPro(isAdmin: boolean) {
    setLoading(isAdmin)
    try {
      await fetch("/api/dev/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin }),
      })
      await update()
    } finally {
      setLoading(null)
    }
  }

  const current = !!session?.isAdmin

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Dev toolbar</p>
            <h1 className="text-lg font-semibold text-white mt-1">Switch plan</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Current: <span className="text-teal-400 font-medium">{current ? "Pro (owner)" : "Free"}</span>
            </p>
          </div>
          <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>

        <div className="space-y-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setPro(opt.isAdmin)}
              disabled={loading !== null}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                current === opt.isAdmin
                  ? "border-teal-500 bg-teal-500/10 text-teal-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>{opt.label}</span>
              <span className="flex items-center gap-2">
                {loading === opt.isAdmin && (
                  <span className="w-3.5 h-3.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                )}
                {current === opt.isAdmin && loading === null && (
                  <span className="text-teal-400 text-xs">✓ active</span>
                )}
              </span>
            </button>
          ))}
        </div>

        <p className="text-xs text-zinc-600 text-center">Only available in development</p>
      </div>
    </div>
  )
}
