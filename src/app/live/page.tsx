import {getServerSession, Session} from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { linkedAccountsRepository, goalsRepository } from "@/repositories"
import { liveEventFeedService } from "@/services"
import { db } from "@/lib/db"
import { subGoals, subEvents, ytMemberEvents, followEvents } from "@/lib/schema"
import { eq, count } from "drizzle-orm"
import { LiveClient } from "./live-client"
import {StreamInfo} from "@/types/stream";
import {streamInfoService} from "@/services/stream-info.service";
import {LinkedAccount} from "@/types/entities";
import {PLATFORM_SPOTIFY, PLATFORM_TWITCH, PLATFORM_YOUTUBE} from "@/types/platform";
import {GoalRow} from "@/repositories/goals.repository";

export default async function LivePage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const broadcasterId = session.twitchId ?? ""
  const youtubeChannelId = session.youtubeChannelId ?? null

  const linkedAccounts: LinkedAccount[] = await linkedAccountsRepository.findByUserId(session.userId)
  const twitchAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_TWITCH)
  const ytAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_YOUTUBE)
  const spotifyAccount: LinkedAccount | undefined = linkedAccounts.find((a: LinkedAccount) => a.provider === PLATFORM_SPOTIFY)

  const [streamInfo, recentEvents, goalRows, extraGoals, followTotalRows, ytMemberTotalRows, subTotalRows] = await Promise.all([
    twitchAccount?.accessToken ? streamInfoService.fetchStreamInfo(broadcasterId, twitchAccount.accessToken) : Promise.resolve<StreamInfo>({ isLive: false, title: null, category: null, viewerCount: null, startedAt: null }),
    liveEventFeedService.getFilteredEvents({ broadcasterId, youtubeChannelId, limit: 15 }),
    broadcasterId ? db.select().from(subGoals).where(eq(subGoals.broadcasterId, broadcasterId)).limit(1) : [],
    goalsRepository.findByUserId(session.userId),
    broadcasterId ? db.select({ total: count() }).from(followEvents).where(eq(followEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
    youtubeChannelId ? db.select({ total: count() }).from(ytMemberEvents).where(eq(ytMemberEvents.channelId, youtubeChannelId)) : [{ total: 0 }],
    broadcasterId ? db.select({ total: count() }).from(subEvents).where(eq(subEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
  ])

  const subGoalRow = goalRows[0] ?? null
  const followGoalRow: GoalRow | null = extraGoals.find(g => g.type === "twitch_follow") ?? null
  const ytMemberGoalRow: GoalRow | null = extraGoals.find(g => g.type === "youtube_member") ?? null

  return (
    <LiveClient
      displayName={session.displayName}
      hasYouTube={!!ytAccount}
      hasSpotify={!!spotifyAccount}
      streamInfo={streamInfo}
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
