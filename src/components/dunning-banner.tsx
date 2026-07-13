"use client"

import { formatDateLong } from "@/lib/format"
import { useEntitlement } from "@/hooks/use-entitlement"

/**
 * Dunning banner (spec §3.5): shown on every app page while a payment is
 * past_due. Keys on the stored `past_due` status ONLY — cancel-during-trial
 * stays "trialing" and must not trigger this (Gate 1 note in the progress doc).
 * `isPro` from the same payload distinguishes in-grace (keep Pro) from lapsed
 * (Pro already gone — the stored status stays past_due until Polar's next
 * webhook, so the copy must not promise "keep" what's already lost).
 */
export function DunningBanner() {
  const { status, graceEndsAt, isPro } = useEntitlement()
  if (status !== "past_due") return null

  const graceEnd = graceEndsAt ? new Date(graceEndsAt) : null
  const inGrace = isPro && graceEnd !== null && graceEnd.getTime() > Date.now()

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 px-6 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center">
      <p className="text-sm text-amber-800 dark:text-amber-300">
        {inGrace ? (
          <>
            Your last payment failed — update your payment method to keep Pro.
            {graceEnd && <span className="ml-1">Pro access ends {formatDateLong(graceEnd)}.</span>}
          </>
        ) : (
          <>Your last payment failed and Pro access has ended — update your payment method to restore it.</>
        )}
      </p>
      <a
        href="/api/portal"
        className="text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg transition-colors"
      >
        Update payment method
      </a>
    </div>
  )
}
