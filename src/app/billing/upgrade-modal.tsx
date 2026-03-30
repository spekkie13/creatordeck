"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TIER_LABELS, TIER_MONTHLY_PRICES, type SubscriptionTier } from "@/lib/gates"

const TIER_PERKS: Record<SubscriptionTier, string[]> = {
  free: [],
  tier1: [
    "Full analytics history (30d / 90d)",
    "Session breakdowns",
    "Platform comparison charts",
  ],
  tier2: [
    "Everything in Tier 1",
    "Custom alert overlays for OBS",
    "Stream info management (title, game)",
    "Cross-platform goals",
  ],
  tier3: [
    "Everything in Tier 2",
    "AI stream analysis",
    "VOD transcription insights",
    "Weekly improvement reports",
  ],
}

type Props = {
  requiredTier: SubscriptionTier
  featureName: string
  onClose: () => void
}

export function UpgradeModal({ requiredTier, featureName, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const perks = TIER_PERKS[requiredTier]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-500">
              {TIER_LABELS[requiredTier]} · {TIER_MONTHLY_PRICES[requiredTier]}
            </span>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <h2 className="text-lg font-semibold">Upgrade to unlock {featureName}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This feature requires {TIER_LABELS[requiredTier]}.
          </p>
        </div>

        {/* Perks */}
        {perks.length > 0 && (
          <ul className="space-y-2">
            {perks.map(perk => (
              <li key={perk} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="text-teal-500 mt-0.5 shrink-0">✓</span>
                {perk}
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/billing"
            onClick={onClose}
            className="w-full text-center bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            View plans
          </Link>
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-1.5 transition-colors"
          >
            Maybe later
          </button>
        </div>

      </div>
    </div>
  )
}
