"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreatorDeckLogo } from "@/components/creator-deck-logo"
import {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";

type Props = {
  displayName: string
}

type Step = 1 | 2 | 3 | 4

export function SetupWizard({ displayName }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [registering, setRegistering] = useState(false)
  const [regStatus, setRegStatus] = useState<"idle" | "success" | "error">("idle")
  const [completing, setCompleting] = useState(false)
  const router: AppRouterInstance = useRouter()

  async function registerSubscriptions() {
    setRegistering(true)
    setRegStatus("idle")
    const res = await fetch("/api/register-subscriptions", { method: "POST" })
    if (res.ok) {
      setRegStatus("success")
      setStep(3)
    } else {
      setRegStatus("error")
    }
    setRegistering(false)
  }

  async function complete(destination: "/dashboard" | "/connections" = "/dashboard") {
    setCompleting(true)
    fetch("/api/onboarding/backfill", { method: "POST" })
    await fetch("/api/onboarding/complete", { method: "POST" })
    router.push(destination)
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex justify-center">
        <CreatorDeckLogo size="sm" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {([1, 2, 3, 4] as Step[]).map(s => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step
                ? "w-8 bg-teal-500"
                : s < step
                  ? "w-4 bg-teal-500/50"
                  : "w-4 bg-zinc-200 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>

      {/* Step 1 — Welcome */}
      {step === 1 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              Welcome, <span className="text-teal-500">{displayName}</span> 👋
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Let&apos;s get CreatorDeck connected to your channel. It only takes a minute.
            </p>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Get started
          </button>
        </div>
      )}

      {/* Step 2 — Register EventSub */}
      {step === 2 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-teal-500 uppercase tracking-wider">Step 1 of 2</p>
            <h2 className="text-xl font-bold">Connect Twitch events</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              This registers your channel with Twitch so CreatorDeck receives follows, subs, bits, and raids in real time. It only needs to be done once.
            </p>
          </div>
          <button
            onClick={registerSubscriptions}
            disabled={registering}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
          >
            {registering ? "Connecting..." : "Connect Twitch events"}
          </button>
          {regStatus === "error" && (
            <p className="text-xs text-red-400 text-center">
              Something went wrong. Check your Twitch app scopes and try again.
            </p>
          )}
        </div>
      )}

      {/* Step 3 — YouTube (optional) */}
      {step === 3 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-teal-500 uppercase tracking-wider">Step 2 of 2</p>
            <h2 className="text-xl font-bold">Connect YouTube</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Stream on YouTube too? Link your channel to unify Super Chats, memberships, and live events alongside Twitch — all in one dashboard.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => complete("/connections")}
              disabled={completing}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
            >
              {completing ? "Just a moment..." : "Connect YouTube"}
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={completing}
              className="w-full text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors py-1"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — Done */}
      {step === 4 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 space-y-6 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
              <span className="text-green-500 text-xl">✓</span>
            </div>
            <h2 className="text-xl font-bold">You&apos;re all set!</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your channel is connected. Events will start appearing in your dashboard the next time you go live.
            </p>
          </div>
          <button
            onClick={() => complete("/dashboard")}
            disabled={completing}
            className="w-full bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium px-6 py-3 rounded-xl transition-colors"
          >
            {completing ? "Opening dashboard..." : "Go to dashboard"}
          </button>
        </div>
      )}
    </div>
  )
}
