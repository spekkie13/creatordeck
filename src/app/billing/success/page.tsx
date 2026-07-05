"use client"

import {useEffect, useState} from "react"
import {useSession} from "next-auth/react"
import {useRouter} from "next/navigation"
import type {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime"

// After checkout, the entitlement flips via webhook — which may land a beat after
// the redirect. Poll our own entitlement endpoint (~10s) rather than assuming
// failure (spec §3.3 success-page race).
const POLL_INTERVAL_MS = 1500
const MAX_ATTEMPTS = 8

export default function BillingSuccessPage() {
    const {update} = useSession()
    const router: AppRouterInstance = useRouter()
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")

    useEffect(() => {
        let cancelled = false

        async function poll() {
            for (let attempt = 0; attempt < MAX_ATTEMPTS && !cancelled; attempt++) {
                try {
                    const res = await fetch("/api/me/entitlement", { cache: "no-store" })
                    if (res.ok) {
                        const { isPro } = await res.json()
                        if (isPro) {
                            await update() // refresh the JWT so client UI reflects Pro
                            if (cancelled) return
                            setStatus("success")
                            setTimeout(() => router.replace("/billing"), 2000)
                            return
                        }
                    }
                } catch {
                    // transient — keep polling
                }
                await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
            }
            if (!cancelled) {
                // Webhook hasn't landed yet; send them to billing where state resolves.
                setStatus("error")
                setTimeout(() => router.replace("/billing"), 3000)
            }
        }

        poll()
        return () => { cancelled = true }
    }, [update, router])

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
                            Pro activated
                        </p>
                    </>
                )}
                {status === "error" && (
                    <>
                        <p className="text-2xl">⚠️</p>
                        <p className="text-lg font-semibold">Still activating…</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Taking you to the billing page…</p>
                    </>
                )}
            </div>
        </div>
    )
}
