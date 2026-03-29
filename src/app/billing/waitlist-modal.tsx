"use client"

import React, {RefObject, useEffect, useRef, useState} from "react"
import { TIER_LABELS } from "@/lib/gates"
import type { SubscriptionTier } from "@/lib/gates"

type Props = {
  tier: Exclude<SubscriptionTier, "free">
  twitchLogin?: string
  onClose: () => void
}

export function WaitlistModal({ tier, twitchLogin, onClose }: Props) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const inputRef: RefObject<HTMLInputElement> = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    try {
      const res: Response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, twitchLogin, interestedTier: tier }),
      })
      setStatus(res.ok ? "done" : "error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          ✕
        </button>

        {status === "done" ? (
          <div className="text-center space-y-3 py-4">
            <p className="text-2xl">🎉</p>
            <p className="text-lg font-semibold">You&apos;re on the list!</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              We&apos;ll email you as soon as {TIER_LABELS[tier]} launches.
            </p>
            <button
              onClick={onClose}
              className="mt-2 text-sm text-purple-500 hover:text-purple-400 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Paid plans coming soon</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You tried to upgrade to <span className="font-medium text-zinc-700 dark:text-zinc-200">{TIER_LABELS[tier]}</span> — leave your email and we&apos;ll notify you the moment it&apos;s available.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={inputRef}
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={status === "loading"}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
              {status === "error" && (
                <p className="text-xs text-red-500">Something went wrong — try again.</p>
              )}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading" ? "Saving..." : "Notify me"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
