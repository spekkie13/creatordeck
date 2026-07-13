"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"

import type { EntitlementPreset } from "@/app/api/dev/set-tier/route"

const OPTIONS = [
  { label: "Free", isAdmin: false },
  { label: "Pro (owner)", isAdmin: true },
] as const

// Entitlement-state presets (Gate 2 walkthroughs). Typed against the route's
// EntitlementPreset export so a renamed/typo'd key fails the build instead of
// silently 400ing. All apply with isAdmin=false so the owner bypass doesn't
// mask the state under test.
const ENTITLEMENT_PRESETS: ReadonlyArray<{ preset: EntitlementPreset; label: string }> = [
  { preset: "free", label: "Free (none)" },
  { preset: "trialing", label: "Trialing (+14d)" },
  { preset: "trial_lapsed", label: "Trial lapsed" },
  { preset: "active", label: "Active" },
  { preset: "canceled_active", label: "Canceled (active)" },
  { preset: "past_due", label: "Past due (in grace)" },
  { preset: "past_due_lapsed", label: "Past due (grace over)" },
  { preset: "revoked", label: "Revoked" },
]

export function DevToolbar() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState<boolean | null>(null)
  const [presetLoading, setPresetLoading] = useState<string | null>(null)

  async function setPro(isAdmin: boolean) {
    setLoading(isAdmin)
    try {
      await fetch("/api/dev/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // "Free" must actually be Free: hasPro = isAdmin OR entitlement, so
        // clearing only the flag would leave a Pro entitlement row in charge.
        body: JSON.stringify(isAdmin ? { isAdmin } : { isAdmin, entitlement: "free" }),
      })
      await update()
    } finally {
      setLoading(null)
    }
  }

  async function setEntitlement(preset: EntitlementPreset) {
    setPresetLoading(preset)
    try {
      await fetch("/api/dev/set-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: false, entitlement: preset }),
      })
      await update()
    } finally {
      setPresetLoading(null)
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

        <div className="border-t border-zinc-800 pt-5 space-y-2">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Entitlement presets</p>
          <p className="text-xs text-zinc-500">Writes your entitlements row directly (sets owner flag off).</p>
          <div className="grid grid-cols-2 gap-2">
            {ENTITLEMENT_PRESETS.map(p => (
              <button
                key={p.preset}
                onClick={() => setEntitlement(p.preset)}
                disabled={presetLoading !== null}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {presetLoading === p.preset && (
                  <span className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                )}
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-zinc-600 text-center">Only available in development</p>
      </div>
    </div>
  )
}
