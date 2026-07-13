"use client"

import Link from "next/link"

/**
 * Locked-feature affordance (spec §3.4): Pro features render visible-but-locked
 * with an upgrade CTA — never hidden. Server gates remain the enforcement.
 */

export function ProLock({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3">
      <span aria-hidden className="text-base leading-6">🔒</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
        {description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{description}</p>
        )}
      </div>
      <Link
        href="/billing"
        className="shrink-0 text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        Upgrade to Pro
      </Link>
    </div>
  )
}

