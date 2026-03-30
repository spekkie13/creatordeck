import { NextAuthOptions } from "next-auth"
import TwitchProvider from "next-auth/providers/twitch"
import GoogleProvider from "next-auth/providers/google"
import { linkedAccountsRepository, userRepository } from "@/repositories"
import { env } from "@/lib/env"
import type { SubscriptionTier } from "@/lib/gates"

async function fetchYouTubeChannelId(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/youtube/v3/channels?part=id&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.items?.[0]?.id ?? null
}

export const authOptions: NextAuthOptions = {
  providers: [
    TwitchProvider({
      clientId: env.twitchClientId,
      clientSecret: env.twitchClientSecret,
      authorization: {
        params: {
          scope: "openid user:read:email channel:read:subscriptions moderator:read:followers user:read:chat chat:read bits:read",
        },
      },
    }),
    GoogleProvider({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account }) {
      return account?.provider === "twitch" || account?.provider === "google"
    },
    async jwt({ token, account, profile, trigger }) {
      // Called when client calls session.update() — refresh linked accounts + tier from DB
      if (trigger === "update" && token.userId) {
        const [accounts, tier] = await Promise.all([
          linkedAccountsRepository.findByUserId(token.userId as string),
          userRepository.getTier(token.userId as string),
        ])
        const ytAccount = accounts.find(a => a.provider === "youtube")
        const twitchAccount = accounts.find(a => a.provider === "twitch")
        token.youtubeChannelId = ytAccount?.providerAccountId ?? null
        token.twitchId = twitchAccount?.providerAccountId ?? null
        token.tier = tier as SubscriptionTier
        delete token.linkingError
        return token
      }

      if (account && profile) {
        const p = profile as Record<string, string>
        const existingUserId = token.userId as string | undefined

        if (account.provider === "twitch") {
          if (existingUserId) {
            try {
              await linkedAccountsRepository.upsertForUser(existingUserId, {
                provider: "twitch",
                providerAccountId: p.sub,
                login: p.preferred_username,
                displayName: p.preferred_username,
                accessToken: account.access_token ?? "",
                refreshToken: account.refresh_token ?? "",
              })
              token.twitchId = p.sub
              delete token.linkingError
            } catch {
              token.linkingError = "account_conflict"
            }
          } else {
            const { userId, apiKey, tier } = await linkedAccountsRepository.upsertWithUser({
              provider: "twitch",
              providerAccountId: p.sub,
              login: p.preferred_username,
              displayName: p.preferred_username,
              accessToken: account.access_token ?? "",
              refreshToken: account.refresh_token ?? "",
            })
            const allAccounts = await linkedAccountsRepository.findByUserId(userId)
            const ytAccount = allAccounts.find(a => a.provider === "youtube")
            token.userId = userId
            token.twitchId = p.sub
            token.youtubeChannelId = ytAccount?.providerAccountId ?? null
            token.displayName = p.preferred_username
            token.apiKey = apiKey
            token.tier = tier as SubscriptionTier
          }

        } else if (account.provider === "google") {
          const channelId = await fetchYouTubeChannelId(account.access_token ?? "")
          if (!channelId) {
            token.linkingError = "no_youtube_channel"
            return token
          }

          if (existingUserId) {
            try {
              await linkedAccountsRepository.upsertForUser(existingUserId, {
                provider: "youtube",
                providerAccountId: channelId,
                login: channelId,
                displayName: p.name ?? channelId,
                accessToken: account.access_token ?? "",
                refreshToken: account.refresh_token ?? "",
              })
              token.youtubeChannelId = channelId
              delete token.linkingError
            } catch {
              token.linkingError = "account_conflict"
            }
          } else {
            const { userId, apiKey, tier } = await linkedAccountsRepository.upsertWithUser({
              provider: "youtube",
              providerAccountId: channelId,
              login: channelId,
              displayName: p.name ?? channelId,
              accessToken: account.access_token ?? "",
              refreshToken: account.refresh_token ?? "",
            })
            const allAccounts = await linkedAccountsRepository.findByUserId(userId)
            const twitchAccount = allAccounts.find(a => a.provider === "twitch")
            token.userId = userId
            token.twitchId = twitchAccount?.providerAccountId ?? null
            token.youtubeChannelId = channelId
            token.displayName = twitchAccount?.displayName ?? p.name ?? channelId
            token.apiKey = apiKey
            token.tier = tier as SubscriptionTier
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      session.userId = token.userId as string
      session.twitchId = token.twitchId as string | null
      session.youtubeChannelId = token.youtubeChannelId as string | null
      session.displayName = token.displayName as string
      session.apiKey = token.apiKey as string
      session.tier = (token.tier ?? "free") as SubscriptionTier
      if (token.linkingError) session.linkingError = token.linkingError
      return session
    },
  },
  pages: { signIn: "/login" },
}
