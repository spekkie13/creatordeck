"use client"

import { useEffect, useRef, useState } from "react"
import type { ChatMessage } from "@/types/chat"

const MAX_MESSAGES = 200

// Slow cadence for the "am I live?" background check while a tab is open and no
// broadcast is active. Infrequent by design (spec §3.6) — never a fast loop.
const SLOW_DETECT_MS = 4 * 60_000
// Light re-check delay while the tab is hidden (no API call is made).
const HIDDEN_RECHECK_MS = 10_000
// Floors/fallbacks so a bad/absent server value can never produce a hot loop.
const MIN_POLL_MS = 1_000
const DEFAULT_POLL_MS = 5_000
// YouTube's pollingIntervalMillis is a MINIMUM wait, not a target. Polling at
// 2× halves quota spend; nothing is lost — each tick resumes from the session's
// pageToken, chat just arrives in ~2× larger batches.
const POLL_STRETCH_FACTOR = 2
const DEFAULT_QUOTA_BACKOFF_MS = 60_000
// Quota exhaustion is usually daily (won't clear mid-stream), so escalate the
// backoff on consecutive quota hits instead of re-hitting the error every 60 s.
const MAX_QUOTA_BACKOFF_MS = 10 * 60_000

export type YouTubeChatStatus =
  | "idle"
  | "not_live"
  | "live"
  | "quota"
  | "ended"
  | "reconnect_required"

type BroadcastResponse = { live?: boolean; status?: string }
type ChatResponse = {
  status: YouTubeChatStatus
  messages?: ChatMessage[]
  pollingIntervalMillis?: number
  retryAfterMillis?: number
}

/**
 * Mode A client loop (spec §3.1). The dashboard drives the ingestion lifecycle:
 * confirm a live broadcast (`/api/youtube/broadcast`), then poll
 * `/api/youtube/chat` scheduling each next tick from the server-returned
 * `pollingIntervalMillis`. Backs off on quota, drops to the slow detection
 * cadence when not live/ended, pauses while the tab is hidden, and fully stops
 * on unmount — so zero YouTube API calls happen with no live broadcast or no
 * open tab (AC4). Google tokens never reach the browser; this only drives timing.
 */
export function useYouTubeChat(enabled: boolean): { messages: ChatMessage[]; status: YouTubeChatStatus } {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [status, setStatus] = useState<YouTubeChatStatus>("idle")

  useEffect(() => {
    if (!enabled) {
      setStatus("idle")
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let quotaAttempts = 0 // consecutive quota hits, for exponential backoff
    const controller = new AbortController()

    const schedule = (fn: () => void, delay: number) => {
      if (cancelled) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(fn, delay)
    }

    async function detect() {
      if (cancelled) return
      if (typeof document !== "undefined" && document.hidden) {
        schedule(detect, HIDDEN_RECHECK_MS) // paused: no API call while hidden
        return
      }
      try {
        const res = await fetch("/api/youtube/broadcast", { signal: controller.signal })
        const data: BroadcastResponse = await res.json()
        if (cancelled) return
        if (data.status === "reconnect_required") {
          setStatus("reconnect_required")
          schedule(detect, SLOW_DETECT_MS)
        } else if (data.live) {
          setStatus("live")
          poll()
        } else {
          setStatus("not_live")
          schedule(detect, SLOW_DETECT_MS)
        }
      } catch {
        if (!cancelled) schedule(detect, SLOW_DETECT_MS)
      }
    }

    async function poll() {
      if (cancelled) return
      if (typeof document !== "undefined" && document.hidden) {
        schedule(poll, HIDDEN_RECHECK_MS) // paused: no API call while hidden
        return
      }
      try {
        const res = await fetch("/api/youtube/chat", { signal: controller.signal })
        const data: ChatResponse = await res.json()
        if (cancelled) return

        if (data.messages?.length) {
          setMessages(prev => [...prev, ...data.messages!].slice(-MAX_MESSAGES))
        }

        switch (data.status) {
          case "live":
            quotaAttempts = 0 // healthy tick — reset backoff
            setStatus("live")
            schedule(poll, Math.max((data.pollingIntervalMillis ?? DEFAULT_POLL_MS) * POLL_STRETCH_FACTOR, MIN_POLL_MS))
            break
          case "quota": {
            setStatus("quota")
            // Escalate: honor the server's retryAfterMillis as the floor, double it
            // per consecutive hit, cap at MAX_QUOTA_BACKOFF_MS. Reset on a live tick.
            const base = data.retryAfterMillis ?? DEFAULT_QUOTA_BACKOFF_MS
            const backoff = Math.min(base * 2 ** quotaAttempts, MAX_QUOTA_BACKOFF_MS)
            quotaAttempts++
            schedule(poll, backoff)
            break
          }
          case "ended":
            setStatus("ended")
            schedule(detect, SLOW_DETECT_MS)
            break
          case "reconnect_required":
            setStatus("reconnect_required")
            schedule(detect, SLOW_DETECT_MS)
            break
          case "not_live":
          default:
            setStatus("not_live")
            schedule(detect, SLOW_DETECT_MS)
            break
        }
      } catch {
        if (!cancelled) schedule(poll, DEFAULT_POLL_MS)
      }
    }

    // Wake immediately when the tab becomes visible again.
    const onVisibility = () => {
      if (!cancelled && typeof document !== "undefined" && !document.hidden) {
        schedule(detect, 100)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    detect()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      controller.abort()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [enabled])

  return { messages, status }
}
