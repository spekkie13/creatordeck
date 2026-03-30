import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import { eq, count, and, gt, ne, isNull } from "drizzle-orm"

import type { LinkedAccount } from "@/types/entities"
import type { GoalRow } from "@/repositories/goals.repository"
import { PLATFORM_TWITCH, PLATFORM_YOUTUBE } from "@/types/platform"

import { db } from "@/lib/db"
import { subEvents, subGoals, followEvents, ytMemberEvents, streamSessions, ytStreamSessions } from "@/lib/schema"
import { authOptions } from "@/lib/auth"

import { eventSubSubscriptionsRepository, userRepository, linkedAccountsRepository, goalsRepository } from "@/repositories"

import { liveEventFeedService } from "@/services"
import { twitchService } from "@/services/twitch.service"
import { youtubeService } from "@/services/youtube.service"

import { DashboardClient } from "./dashboard-client"

export default async function DashboardPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const broadcasterId: string = session.twitchId ?? ""
  const youtubeChannelId: string | null = session.youtubeChannelId ?? null
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [user, goalRows, totalRows, recentEvents, subscriptionsRegistered, linkedAccounts, followTotalRows, ytMemberTotalRows, extraGoals, twitchLiveSessions, ytLiveSessions] = await Promise.all([
    userRepository.findById(session.userId),
    broadcasterId ? db.select().from(subGoals).where(eq(subGoals.broadcasterId, broadcasterId)).limit(1) : [],
    broadcasterId ? db.select({ total: count() }).from(subEvents).where(eq(subEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
    liveEventFeedService.getFilteredEvents({ broadcasterId, youtubeChannelId: session.youtubeChannelId, limit: 15 }),
    broadcasterId ? eventSubSubscriptionsRepository.existsByBroadcasterId(broadcasterId) : false,
    linkedAccountsRepository.findByUserId(session.userId),
    broadcasterId ? db.select({ total: count() }).from(followEvents).where(eq(followEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
    youtubeChannelId ? db.select({ total: count() }).from(ytMemberEvents).where(eq(ytMemberEvents.channelId, youtubeChannelId)) : [{ total: 0 }],
    goalsRepository.findByUserId(session.userId),
    broadcasterId ? db.select().from(streamSessions).where(and(eq(streamSessions.broadcasterId, broadcasterId), isNull(streamSessions.endedAt))).limit(1) : [],
    youtubeChannelId ? db.select().from(ytStreamSessions).where(and(eq(ytStreamSessions.channelId, youtubeChannelId), isNull(ytStreamSessions.endedAt))).limit(1) : [],
  ])

  if (!user?.onboardingCompleted) redirect("/setup")

  const twitchAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_TWITCH)
  const ytAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_YOUTUBE)

  const [followerCount, subCount, ytSubCount, followerGrowthRows, subGrowthRows] = await Promise.all([
    twitchAccount?.accessToken ? twitchService.fetchTwitchFollowerCount(broadcasterId, twitchAccount.accessToken) : null,
    twitchAccount?.accessToken ? twitchService.fetchTwitchSubCount(broadcasterId, twitchAccount.accessToken) : null,
    ytAccount?.accessToken ? youtubeService.fetchYouTubeSubCount(ytAccount.accessToken, ytAccount.refreshToken ?? null, ytAccount.providerAccountId) : null,
    broadcasterId
      ? db.select({ total: count() }).from(followEvents).where(and(eq(followEvents.broadcasterId, broadcasterId), gt(followEvents.occurredAt, thirtyDaysAgo)))
      : Promise.resolve([{ total: 0 }]),
    broadcasterId
      ? db.select({ total: count() }).from(subEvents).where(and(eq(subEvents.broadcasterId, broadcasterId), gt(subEvents.occurredAt, thirtyDaysAgo), ne(subEvents.kind, "resub")))
      : Promise.resolve([{ total: 0 }]),
  ])

  const goal: number = goalRows[0]?.goal ?? 100
  const initialCount: number = goalRows[0]?.initialCount ?? 0
  const endsAt: string | null = goalRows[0]?.endsAt?.toISOString() ?? null
  const total: number = totalRows[0]?.total ?? 0

  const followGoalRow: GoalRow | null = extraGoals.find(g => g.type === "twitch_follow") ?? null
  const ytMemberGoalRow: GoalRow | null = extraGoals.find(g => g.type === "youtube_member") ?? null

  return (
    <DashboardClient
      session={session}
      goal={goal}
      initialCount={initialCount}
      endsAt={endsAt}
      total={total}
      initialEvents={recentEvents.events}
      subscriptionsRegistered={subscriptionsRegistered}
      followerCount={followerCount}
      subCount={subCount}
      ytSubCount={ytSubCount}
      hasYouTube={!!ytAccount}
      followerGrowth={followerGrowthRows[0]?.total ?? 0}
      subGrowth={subGrowthRows[0]?.total ?? 0}
      followTotal={followTotalRows[0]?.total ?? 0}
      followGoal={followGoalRow?.goal ?? null}
      ytMemberTotal={ytMemberTotalRows[0]?.total ?? 0}
      ytMemberGoal={ytMemberGoalRow?.goal ?? null}
      twitchIsLive={twitchLiveSessions.length > 0}
      ytIsLive={ytLiveSessions.length > 0}
      ytLiveTitle={ytLiveSessions[0]?.title ?? null}
    />
  )
}
