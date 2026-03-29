import { NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { chatMessagesRepository } from "@/repositories"

const POLL_INTERVAL_MS = 5000
const INITIAL_LOOKBACK_MS = 5 * 60 * 1000

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.youtubeChannelId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const channelId = session.youtubeChannelId

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      let lastSent = new Date(Date.now() - INITIAL_LOOKBACK_MS)

      const poll = async () => {
        try {
          const messages = await chatMessagesRepository.getSince(channelId, lastSent)
          if (messages.length > 0) {
            lastSent = new Date()
            controller.enqueue(encode(messages))
          }
        } catch (err) {
          console.error("YouTube chat SSE poll error:", err)
        }
      }

      await poll()
      const interval = setInterval(poll, POLL_INTERVAL_MS)

      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
