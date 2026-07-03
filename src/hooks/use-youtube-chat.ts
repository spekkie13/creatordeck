"use client"

import type { ChatMessage } from "@/types/chat"

// Phase 0 teardown stub. The unofficial `youtube-chat` scraper source and its
// SSE route (`/api/events/youtube-chat`) were removed; official-API ingestion
// lands in Phase 2 per plans/youtube-chat-connect-plan.md. Until then this hook
// keeps its `ChatMessage[]` contract so `live-client.tsx` compiles and Twitch
// chat is unaffected — YouTube chat is simply empty.
export function useYouTubeChat(_enabled: boolean): ChatMessage[] {
  return []
}