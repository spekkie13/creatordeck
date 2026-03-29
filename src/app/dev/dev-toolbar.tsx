"use client"
import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { TIER_LABELS, TIER_PRICES } from "@/lib/gates"
import type { SubscriptionTier } from "@/lib/gates"

const TIERS: SubscriptionTier[] = ["free", "tier1", "tier2", "tier3"]

export function DevToolbar() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState<SubscriptionTier | null>(null)

  async function setTier(tier: SubscriptionTier) {
    setLoading(tier)
    try {
      await fetch("/api/dev/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      await update()
    } finally {
      setLoading(null)
    }
  }

  const current: SubscriptionTier = session?.tier ?? "free"

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-full max-w-sm space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Dev toolbar</p>
            <h1 className="text-lg font-semibold text-white mt-1">Switch subscription tier</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Current: <span className="text-purple-400 font-medium">{TIER_LABELS[current]}</span>
            </p>
          </div>
          <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>

        <div className="space-y-2">
          {TIERS.map(tier => (
            <button
              key={tier}
              onClick={() => setTier(tier)}
              disabled={loading !== null}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                current === tier
                  ? "border-purple-500 bg-purple-500/10 text-purple-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span>{TIER_LABELS[tier]}</span>
              <span className="flex items-center gap-2">
                <span className="text-zinc-500 text-xs">{TIER_PRICES[tier]}</span>
                {loading === tier && (
                  <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                )}
                {current === tier && loading === null && (
                  <span className="text-purple-400 text-xs">✓ active</span>
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
