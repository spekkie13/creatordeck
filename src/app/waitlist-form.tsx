"use client"

import React, { useState } from "react"

export function WaitlistForm() {
  const [email, setEmail] = useState("")
  const [twitchLogin, setTwitchLogin] = useState("")
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState("loading")

    const res: Response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, twitchLogin }),
    })

    setState(res.ok ? "done" : "error")
  }

  if (state === "done") {
    return (
      <p className="text-green-500 text-sm">
        You&apos;re on the list. We&apos;ll reach out when it&apos;s ready.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-sm mx-auto">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500"
      />
      <input
        type="text"
        placeholder="Twitch channel (optional)"
        value={twitchLogin}
        onChange={e => setTwitchLogin(e.target.value)}
        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-purple-500"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
      >
        {state === "loading" ? "Saving…" : "Notify me"}
      </button>
      {state === "error" && (
        <p className="text-red-500 text-xs text-center">Something went wrong, try again.</p>
      )}
    </form>
  )
}
