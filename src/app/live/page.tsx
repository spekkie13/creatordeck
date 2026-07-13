import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import { eq, count } from "drizzle-orm"

import type { StreamInfo } from "@/types/stream"
import { PLATFORM_SPOTIFY, PLATFORM_TWITCH, PLATFORM_YOUTUBE } from "@/types/platform"

import { db } from "@/lib/db"
import { subGoals, subEvents, ytMemberEvents, followEvents } from "@/lib/schema"
import { authOptions } from "@/lib/auth"

import { linkedAccountsRepository, goalsRepository, streamSessionRepository } from "@/repositories"
import type { GoalRow } from "@/repositories/goals.repository"

import { liveEventFeedService } from "@/services"
import { streamInfoService } from "@/services/stream-info.service"
import { hasPro } from "@/lib/require-pro"

import { LiveClient } from "./live-client"

export default async function LivePage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const broadcasterId = session.twitchId ?? ""
  const youtubeChannelId = session.youtubeChannelId ?? null

  const [twitchAccount, ytAccount, spotifyAccount, isPro] = await Promise.all([
    linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_TWITCH),
    linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_YOUTUBE),
    linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_SPOTIFY),
    hasPro(session.userId),
  ])

  const [streamInfo, recentEvents, goalRows, extraGoals, followTotalRows, ytMemberTotalRows, subTotalRows] = await Promise.all([
    twitchAccount?.accessToken ? streamInfoService.fetchStreamInfo(broadcasterId, twitchAccount.accessToken) : Promise.resolve<StreamInfo>({ isLive: false, title: null, category: null, viewerCount: null, startedAt: null }),
    liveEventFeedService.getFilteredEvents({ broadcasterId, youtubeChannelId, limit: 15 }),
    broadcasterId ? db.select().from(subGoals).where(eq(subGoals.broadcasterId, broadcasterId)).limit(1) : [],
    goalsRepository.findByUserId(session.userId),
    broadcasterId ? db.select({ total: count() }).from(followEvents).where(eq(followEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
    youtubeChannelId ? db.select({ total: count() }).from(ytMemberEvents).where(eq(ytMemberEvents.channelId, youtubeChannelId)) : [{ total: 0 }],
    broadcasterId ? db.select({ total: count() }).from(subEvents).where(eq(subEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
  ])

  // Reconcile stream session: if Twitch says we're live but no open session exists, create one.
  // This handles cases where the EventSub webhook missed the stream.online event.
  if (streamInfo.isLive && broadcasterId) {
    const openSession = await streamSessionRepository.findOpen(broadcasterId)
    if (!openSession) {
      const startedAt = streamInfo.startedAt ? new Date(streamInfo.startedAt) : new Date()
      await streamSessionRepository.create(broadcasterId, startedAt)
    }
  }

  const subGoalRow = goalRows[0] ?? null
  const followGoalRow: GoalRow | null = extraGoals.find(g => g.type === "twitch_follow") ?? null
  const ytMemberGoalRow: GoalRow | null = extraGoals.find(g => g.type === "youtube_member") ?? null

  return (
    <LiveClient
      displayName={session.displayName}
      twitchLogin={twitchAccount?.login ?? session.displayName ?? ""}
      hasYouTube={!!ytAccount && isPro}
      hasSpotify={!!spotifyAccount}
      initialStreamInfo={streamInfo}
      initialEvents={recentEvents.events}
      subGoal={subGoalRow ? { ...subGoalRow, endsAt: subGoalRow.endsAt?.toISOString() ?? null } : null}
      subTotal={subTotalRows[0]?.total ?? 0}
      followGoal={followGoalRow ? { goal: followGoalRow.goal } : null}
      followTotal={followTotalRows[0]?.total ?? 0}
      ytMemberGoal={ytMemberGoalRow ? { goal: ytMemberGoalRow.goal } : null}
      ytMemberTotal={ytMemberTotalRows[0]?.total ?? 0}
    />
  )
}
