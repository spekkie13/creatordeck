"use client"

import { useState, useEffect } from "react"
import { ChatMessage } from "@/types/chat";

const MAX_MESSAGES = 200

function parseTags(tagStr: string): Record<string, string> {
  const tags: Record<string, string> = {}
  for (const part of tagStr.split(";")) {
    const eq: number = part.indexOf("=")
    if (eq !== -1) tags[part.slice(0, eq)] = part.slice(eq + 1)
  }
  return tags
}

export function useTwitchChat(channelLogin: string): ChatMessage[] {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    if (!channelLogin) return

    let ws: WebSocket | null = null
    let pingInterval: ReturnType<typeof setInterval> | null = null
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let unmounted: boolean = false

    const connect = async () => {
      try {
        const res: Response = await fetch("/api/twitch/chat-auth")
        if (!res.ok) return
        const { token, login } = await res.json() as { token: string; login: string }

        if (unmounted) return

        ws = new WebSocket("wss://irc-ws.chat.twitch.tv:443")

        ws.onopen = () => {
          console.log("[TwitchChat] WebSocket connected, authenticating as", login)
          ws!.send(`PASS oauth:${token}`)
          ws!.send(`NICK ${login.toLowerCase()}`)
          ws!.send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership")
          ws!.send(`JOIN #${channelLogin.toLowerCase()}`)
          pingInterval = setInterval(() => ws?.send("PING :tmi.twitch.tv"), 240_000)
        }

        ws.onmessage = (event: MessageEvent<string>) => {
          const lines: string[] = event.data.split("\r\n").filter(Boolean)
          const incoming: ChatMessage[] = []

          for (const line of lines) {
            console.log("[TwitchChat]", line)

            if (line.startsWith("PING")) {
              ws?.send("PONG :tmi.twitch.tv")
              continue
            }

            // With tags: @tags :nick!user@host.tmi.twitch.tv PRIVMSG #channel :message
            const taggedMatch = line.match(/^@([^ ]+) :[^!]+![^ ]+ PRIVMSG #[^ ]+ :(.+)$/)
            if (taggedMatch) {
              const tags = parseTags(taggedMatch[1])
              const displayName = tags["display-name"] || tags["login"] || "unknown"
              incoming.push({
                id: crypto.randomUUID(),
                platform: "twitch",
                userDisplayName: displayName,
                message: taggedMatch[2],
                occurredAt: new Date().toISOString(),
              })
              continue
            }

            const plainMatch: RegExpMatchArray | null = line.match(/^:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.+)$/)
            if (plainMatch) {
              incoming.push({
                id: crypto.randomUUID(),
                platform: "twitch",
                userDisplayName: plainMatch[1],
                message: plainMatch[2],
                occurredAt: new Date().toISOString(),
              })
            }
          }

          if (incoming.length > 0) {
            setMessages(prev => [...prev, ...incoming].slice(-MAX_MESSAGES))
          }
        }

        ws.onerror = (err) => {
          console.error("[TwitchChat] WebSocket error", err)
          ws?.close()
        }

        ws.onclose = (evt) => {
          console.log("[TwitchChat] WebSocket closed", evt.code, evt.reason)
          if (pingInterval) clearInterval(pingInterval)
          if (!unmounted) {
            reconnectTimeout = setTimeout(connect, 3_000)
          }
        }
      } catch (err) {
        console.error("[TwitchChat] connect error", err)
        if (!unmounted) {
          reconnectTimeout = setTimeout(connect, 5_000)
        }
      }
    }

    connect()

    return () => {
      unmounted = true
      if (pingInterval) clearInterval(pingInterval)
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      ws?.close()
    }
  }, [channelLogin])

  return messages
}
