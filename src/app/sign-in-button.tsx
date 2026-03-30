"use client"

import { signIn } from "next-auth/react"

import type { SignInButtonProps } from "@/props/sign-in-button.props"
import { PLATFORM_TWITCH } from "@/types/platform"

import { TwitchLogo, YouTubeLogo } from "@/components/platform-logos"

export function SignInButton({ variant = "primary" }: SignInButtonProps) {
  if (variant === "ghost") {
    return (
      <button
        onClick={() => signIn(PLATFORM_TWITCH, { callbackUrl: "/dashboard" })}
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
      >
        Sign in
      </button>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <button
        onClick={() => signIn(PLATFORM_TWITCH, { callbackUrl: "/dashboard" })}
        className="inline-flex items-center gap-2.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
      >
        <TwitchLogo className="w-4 h-4" />
        Continue with Twitch
      </button>
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="inline-flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
      >
        <YouTubeLogo className="w-4 h-4" />
        Continue with YouTube
      </button>
    </div>
  )
}
