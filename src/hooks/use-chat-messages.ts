"use client"

import { useState, useEffect } from "react"

export type ChatMessage = {
  id: string
  platform: string
  channelId: string
  userId: string | null
  userLogin: string | null
  userDisplayName: string | null
  message: string
  occurredAt: string
}

const MAX_MESSAGES = 200

export function useChatMessages(): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const es = new EventSource("/api/chat/stream")

    es.onmessage = (e: MessageEvent) => {
      const incoming: ChatMessage[] = JSON.parse(e.data)
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id))
        const newMessages = incoming.filter(m => !existingIds.has(m.id))
        return [...prev, ...newMessages].slice(-MAX_MESSAGES)
      })
    }

    es.onerror = () => es.close()

    return () => es.close()
  }, [])

  return messages
}