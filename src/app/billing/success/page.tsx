"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import type { ReadonlyURLSearchParams } from "next/navigation"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

import { TIER_LABELS } from "@/lib/gates"
import type { SubscriptionTier } from "@/lib/gates"

export default function BillingSuccessPage() {
  const { update } = useSession()
  const router: AppRouterInstance = useRouter()
  const searchParams: ReadonlyURLSearchParams = useSearchParams()
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")
  const [tier, setTier] = useState<SubscriptionTier | null>(null)

  useEffect(() => {
    const sessionId: string | null = searchParams.get("session_id")
    if (!sessionId) {
      router.replace("/billing")
      return
    }

    async function verify() {
      try {
        const res: Response = await fetch(`/api/stripe/verify-checkout?session_id=${sessionId}`)
        if (!res.ok) throw new Error("Verification failed")
        const data = await res.json()
        setTier(data.tier)
        setStatus("success")
        await update()
        setTimeout(() => router.replace("/billing"), 2500)
      } catch {
        setStatus("error")
        setTimeout(() => router.replace("/billing"), 3000)
      }
    }

    verify()
  }, [searchParams, update, router])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-3">
        {status === "verifying" && (
          <>
            <p className="text-2xl">⏳</p>
            <p className="text-lg font-semibold">Activating your plan...</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Just a moment</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-2xl">🎉</p>
            <p className="text-lg font-semibold">You&apos;re all set!</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {tier ? `${TIER_LABELS[tier]} activated` : "Plan activated"} — redirecting to billing...
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-2xl">⚠️</p>
            <p className="text-lg font-semibold">Something went wrong</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Redirecting to billing page...</p>
          </>
        )}
      </div>
    </div>
  )
}
