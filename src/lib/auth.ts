import {NextAuthOptions, Session} from "next-auth"
import TwitchProvider from "next-auth/providers/twitch"
import GoogleProvider from "next-auth/providers/google"

import { env } from "@/lib/env"

import { linkedAccountsRepository, userRepository } from "@/repositories"
import {PLATFORM_TWITCH, PLATFORM_YOUTUBE} from "@/types/platform";
import {JWT} from "next-auth/jwt";
import {LinkedAccount} from "@/types/entities";
import {SubscriptionTier} from "@/types/tier";

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
          scope: "openid email profile https://www.googleapis.com/auth/youtube.force-ssl",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account }) {
      return account?.provider === PLATFORM_TWITCH || account?.provider === "google"
    },
    async jwt({ token, account, profile, trigger }) {
      if (trigger === "update" && token.userId) {
        const [ytAccount, twitchAccount, user] = await Promise.all([
          linkedAccountsRepository.findByUserIdAndProvider(token.userId as string, PLATFORM_YOUTUBE),
          linkedAccountsRepository.findByUserIdAndProvider(token.userId as string, PLATFORM_TWITCH),
          userRepository.findById(token.userId as string),
        ])
        token.youtubeChannelId = ytAccount?.providerAccountId ?? null
        token.twitchId = twitchAccount?.providerAccountId ?? null
        token.tier = (user?.tier ?? "free") as SubscriptionTier
        token.isAdmin = user?.isAdmin ?? false
        delete token.linkingError
        return token
      }

      if (account && profile) {
        const p = profile as Record<string, string>
        const existingUserId = token.userId as string | undefined

        if (account.provider === PLATFORM_TWITCH) {
          if (existingUserId) {
            try {
              await linkedAccountsRepository.upsertForUser(existingUserId, {
                provider: PLATFORM_TWITCH,
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
              provider: PLATFORM_TWITCH,
              providerAccountId: p.sub,
              login: p.preferred_username,
              displayName: p.preferred_username,
              accessToken: account.access_token ?? "",
              refreshToken: account.refresh_token ?? "",
            })
            const [ytAccount, user] = await Promise.all([
              linkedAccountsRepository.findByUserIdAndProvider(userId, PLATFORM_YOUTUBE),
              userRepository.findById(userId),
            ])
            token.userId = userId
            token.twitchId = p.sub
            token.youtubeChannelId = ytAccount?.providerAccountId ?? null
            token.displayName = p.preferred_username
            token.apiKey = apiKey
            token.tier = tier as SubscriptionTier
            token.isAdmin = user?.isAdmin ?? false
          }

        } else if (account.provider === "google") {
          const channelId: string | null = await fetchYouTubeChannelId(account.access_token ?? "")
          if (!channelId) {
            token.linkingError = "no_youtube_channel"
            return token
          }

          if (existingUserId) {
            try {
              await linkedAccountsRepository.upsertForUser(existingUserId, {
                provider: PLATFORM_YOUTUBE,
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
              provider: PLATFORM_YOUTUBE,
              providerAccountId: channelId,
              login: channelId,
              displayName: p.name ?? channelId,
              accessToken: account.access_token ?? "",
              refreshToken: account.refresh_token ?? "",
            })
            const [twitchAccount, user] = await Promise.all([
              linkedAccountsRepository.findByUserIdAndProvider(userId, PLATFORM_TWITCH),
              userRepository.findById(userId),
            ])
            token.userId = userId
            token.twitchId = twitchAccount?.providerAccountId ?? null
            token.youtubeChannelId = channelId
            token.displayName = twitchAccount?.displayName ?? p.name ?? channelId
            token.apiKey = apiKey
            token.tier = tier as SubscriptionTier
            token.isAdmin = user?.isAdmin ?? false
          }
        }
      }
      return token
    },
    async session({ session, token } : {session: Session; token: JWT}) {
      session.userId = token.userId as string
      session.twitchId = token.twitchId as string | null
      session.youtubeChannelId = token.youtubeChannelId as string | null
      session.displayName = token.displayName as string
      session.apiKey = token.apiKey as string
      session.tier = (token.tier ?? "free") as SubscriptionTier
      session.isAdmin = (token.isAdmin as boolean) ?? false
      if (token.linkingError) session.linkingError = token.linkingError
      return session
    },
  },
  pages: { signIn: "/login" },
}
