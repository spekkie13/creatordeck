"use client"

import type { ReactNode } from "react"
import Link from "next/link"

/**
 * Locked-feature affordances (spec §3.4): Pro features render visible-but-locked
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

export function LockedPreview({ title, description, children }: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none opacity-40 grayscale">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-4 text-center shadow-lg max-w-xs">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            <span aria-hidden className="mr-1.5">🔒</span>
            {title}
          </p>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
          )}
          <Link
            href="/billing"
            className="inline-block mt-3 text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  )
}
