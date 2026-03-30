"use client"

import { useState, useEffect } from "react"
import { PLATFORM_YOUTUBE } from "@/types/platform"
import { ChatMessage } from "@/types/chat";

const MAX_MESSAGES = 200

export function useYouTubeChat(enabled: boolean): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([])

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
        const incoming: ChatMessage[] = rows.map(r => ({
          id: r.id,
          platform: PLATFORM_YOUTUBE,
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
