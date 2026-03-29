"use client"

import { useState, useEffect } from "react"
import type { TwitchChatMessage } from "./use-twitch-chat"

const MAX_MESSAGES = 200

export function useYouTubeChat(enabled: boolean): TwitchChatMessage[] {
  const [messages, setMessages] = useState<TwitchChatMessage[]>([])

  useEffect(() => {
    if (!enabled) return

    const es = new EventSource("/api/events/youtube-chat")

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const rows = JSON.parse(event.data) as Array<{
          id: string
          userDisplayName: string | null
          message: string
          occurredAt: string
        }>
        const incoming: TwitchChatMessage[] = rows.map(r => ({
          id: r.id,
          platform: "youtube" as const,
          userDisplayName: r.userDisplayName ?? "Unknown",
          message: r.message,
          occurredAt: r.occurredAt,
        }))
        setMessages(prev => [...prev, ...incoming].slice(-MAX_MESSAGES))
      } catch (err) {
        console.error("[YouTubeChat] parse error", err)
      }
    }

    es.onerror = () => {
      console.error("[YouTubeChat] EventSource error")
    }

    return () => es.close()
  }, [enabled])

  return messages
}
