import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import type { LinkedAccount } from "@/types/entities"
import { PLATFORM_SPOTIFY, PLATFORM_TWITCH, PLATFORM_YOUTUBE } from "@/types/platform"

import { authOptions } from "@/lib/auth"

import { eventSubSubscriptionsRepository, linkedAccountsRepository, ytStreamSessionsRepository } from "@/repositories"

import { fromSearchError } from "@/services/connections.service"

import {
  SpotifyLogo,
  TwitchLogo, TwitchManage,
  WidgetTokenSection,
  YouTubeConnectButton, YouTubeLogo, YouTubeManage
} from "@/components"

import { AppHeader } from "@/app/dashboard/app-header"
import { ConnectionsUpdater } from "@/app/connections/connections-updater"
import { ConnectionRow } from "@/app/connections/connection-row"
import { DisconnectButton } from "@/app/connections/disconnect-button"
import { SpotifyConnectButton } from "@/app/connections/spotify-connect"

export default async function ConnectionsPage({ searchParams }: {
  searchParams: { error?: string; linked?: string }
}) {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const [subscriptionsRegistered, linkedAccounts] = await Promise.all([
    session.twitchId ? eventSubSubscriptionsRepository.existsByBroadcasterId(session.twitchId) : false,
    session.userId ? linkedAccountsRepository.findByUserId(session.userId) : [],
  ])

  const youtubePollerActive: boolean = session.youtubeChannelId
    ? await ytStreamSessionsRepository.isActive(session.youtubeChannelId)
    : false

  const youtubeAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_YOUTUBE)
  const twitchAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_TWITCH)
  const spotifyAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_SPOTIFY)
  const canDisconnect: boolean = linkedAccounts.length > 1
  const hasYouTubeError: boolean = !!searchParams.error
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`

  let errorMessage: string = "";
  if (searchParams.error) {
    errorMessage = fromSearchError(searchParams.error);
  }

  return (
    <div className="min-h-screen">
      <ConnectionsUpdater />
      <AppHeader displayName={session.displayName} />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Connections</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage the platforms and services connected to CreatorDeck.</p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Connection failed</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">{errorMessage}</p>
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800">
          <ConnectionRow
            name="Twitch"
            description="Enables live event tracking, sub goals, and EventSub webhooks."
            connected={!!twitchAccount}
            logo={<TwitchLogo className="w-5 h-5 text-[#9146FF]" />}
            detail={twitchAccount ? `Connected as ${twitchAccount.displayName ?? twitchAccount.login}` : undefined}
            disconnectButton={canDisconnect ? <DisconnectButton provider="twitch" /> : undefined}
          >
            {twitchAccount && (
              <TwitchManage webhookUrl={webhookUrl} subscriptionsRegistered={subscriptionsRegistered} />
            )}
          </ConnectionRow>
          <ConnectionRow
            name="YouTube"
            description="Track Super Chats, memberships, and live chat activity."
            connected={!!youtubeAccount && !hasYouTubeError}
            logo={<YouTubeLogo className="w-5 h-5 text-[#FF0000]" />}
            detail={youtubeAccount && !hasYouTubeError ? `Connected as ${youtubeAccount.displayName ?? youtubeAccount.login ?? youtubeAccount.providerAccountId}` : undefined}
            connectButton={<YouTubeConnectButton retry={hasYouTubeError} />}
            disconnectButton={canDisconnect && !hasYouTubeError ? <DisconnectButton provider="youtube" /> : undefined}
          >
            {youtubeAccount && !hasYouTubeError && (
              <YouTubeManage
                channelId={youtubeAccount.providerAccountId}
                displayName={youtubeAccount.displayName ?? youtubeAccount.providerAccountId}
                isPollerActive={youtubePollerActive}
              />
            )}
          </ConnectionRow>
          <ConnectionRow
            name="Spotify"
            description="Show your currently playing track and control playback from the live view."
            connected={!!spotifyAccount}
            logo={<SpotifyLogo className="w-5 h-5 text-[#1DB954]" />}
            detail={spotifyAccount ? `Connected as ${spotifyAccount.displayName ?? spotifyAccount.login}` : undefined}
            connectButton={<SpotifyConnectButton />}
            disconnectButton={spotifyAccount ? <DisconnectButton provider="spotify" /> : undefined}
          />
        </div>

        {!canDisconnect && (
          <p className="text-xs text-zinc-500 text-center">
            Connect another platform before disconnecting your only linked account.
          </p>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-white">OBS Browser Sources</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Goal overlays you can drop directly into OBS.</p>
          </div>
          <WidgetTokenSection appUrl={process.env.NEXT_PUBLIC_APP_URL!} />
        </div>
      </main>
    </div>
  )
}
