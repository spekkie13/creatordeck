"use client"

import React, { useState } from "react"

import type { LiveEvent } from "@/types/events"

export function ReplayButton({ event }: { event: LiveEvent }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle")

  async function replay(e: React.MouseEvent) {
    e.stopPropagation()
    if (state !== "idle") return
    setState("sending")
    await fetch("/api/events/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    })
    setState("done")
    setTimeout(() => setState("idle"), 1500)
  }

  return (
    <button
      onClick={replay}
      title="Re-roll alert"
      className={`shrink-0 text-sm leading-none transition-colors ${
        state === "done"
          ? "text-green-500"
          : state === "sending"
          ? "text-zinc-300 dark:text-zinc-600"
          : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
      }`}
    >
      {state === "done" ? "✓" : "↺"}
    </button>
  )
}
