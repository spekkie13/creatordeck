"use client"

import { useState, useEffect } from "react"
import { PLATFORM_YOUTUBE } from "@/types/platform"
import type { ChatMessage } from "@/types/chat"
import type { YouTubeSseEvent } from "@/lib/youtube-chat-mapper"

const MAX_MESSAGES = 200

export function useYouTubeChat(enabled: boolean): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (!enabled) return

    const es = new EventSource("/api/events/youtube-chat")

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as YouTubeSseEvent

        if (payload.type === "chat") {
          const msg: ChatMessage = {
            id: payload.id,
            platform: PLATFORM_YOUTUBE,
            userDisplayName: payload.userDisplayName ?? "Unknown",
            message: payload.message,
            occurredAt: payload.occurredAt,
          }
          setMessages(prev => [...prev, msg].slice(-MAX_MESSAGES))
        } else if (payload.type === "error") {
          console.error("[YouTubeChat] server error", payload.reason, payload.detail)
          if (payload.reason === "not_live") es.close()
        }
        // superchat / member events are received but not surfaced in chat list
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
