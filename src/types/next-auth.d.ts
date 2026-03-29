import "next-auth"
import type { SubscriptionTier } from "@/lib/gates"

declare module "next-auth" {
  interface Session {
    userId: string
    twitchId: string | null
    youtubeChannelId: string | null
    displayName: string
    apiKey: string
    tier: SubscriptionTier
    linkingError?: "account_conflict" | "no_youtube_channel"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    twitchId: string | null
    youtubeChannelId: string | null
    displayName: string
    apiKey: string
    tier: SubscriptionTier
    linkingError?: "account_conflict" | "no_youtube_channel"
  }
}
