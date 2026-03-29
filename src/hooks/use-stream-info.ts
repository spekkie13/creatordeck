"use client"

import { useState, useEffect } from "react"
import type { StreamInfo } from "@/types/stream"

const POLL_INTERVAL_MS = 30_000

export function useStreamInfo(initial: StreamInfo): StreamInfo {
  const [info, setInfo] = useState<StreamInfo>(initial)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/stream-info")
        if (res.ok) setInfo(await res.json() as StreamInfo)
      } catch {
        // keep last known state on network error
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return info
}
