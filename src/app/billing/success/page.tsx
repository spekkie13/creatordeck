"use client"

import {useEffect, useState} from "react"
import {useSession} from "next-auth/react"
import {useRouter} from "next/navigation"
import type {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime"

export default function BillingSuccessPage() {
    const {update} = useSession()
    const router: AppRouterInstance = useRouter()
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying")

    useEffect(() => {
        async function finish() {
            try {
                await update()
                setStatus("success")
                setTimeout(() => router.replace("/billing"), 2500)
            } catch {
                setStatus("error")
                setTimeout(() => router.replace("/billing"), 3000)
            }
        }

        finish()
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
                            Plan activated
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
