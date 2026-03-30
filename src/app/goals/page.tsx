import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import { eq, count } from "drizzle-orm"

import type { LinkedAccount } from "@/types/entities"
import type { GoalRow } from "@/repositories/goals.repository"

import { db } from "@/lib/db"
import { subEvents, subGoals, followEvents, ytMemberEvents } from "@/lib/schema"
import { authOptions } from "@/lib/auth"

import { linkedAccountsRepository, goalsRepository } from "@/repositories"

import { AppHeader } from "@/app/dashboard/app-header"
import { GoalsClient } from "./goals-client"

export default async function GoalsPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const broadcasterId: string = session.twitchId ?? ""
  const youtubeChannelId: string | null = session.youtubeChannelId ?? null

  const [goalRows, subTotalRows, followTotalRows, ytMemberTotalRows, linkedAccounts, extraGoals] = await Promise.all([
    broadcasterId ? db.select().from(subGoals).where(eq(subGoals.broadcasterId, broadcasterId)).limit(1) : [],
    broadcasterId ? db.select({ total: count() }).from(subEvents).where(eq(subEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
    broadcasterId ? db.select({ total: count() }).from(followEvents).where(eq(followEvents.broadcasterId, broadcasterId)) : [{ total: 0 }],
    youtubeChannelId ? db.select({ total: count() }).from(ytMemberEvents).where(eq(ytMemberEvents.channelId, youtubeChannelId)) : [{ total: 0 }],
    linkedAccountsRepository.findByUserId(session.userId),
    goalsRepository.findByUserId(session.userId),
  ])

  const hasTwitch: boolean = !!linkedAccounts.find((a: LinkedAccount) => a.provider === "twitch")
  const hasYouTube: boolean = !!linkedAccounts.find((a: LinkedAccount) => a.provider === "youtube")

  const subGoalRow = goalRows[0]
  const followGoalRow: GoalRow | null = extraGoals.find((g: GoalRow) => g.type === "twitch_follow") ?? null
  const ytMemberGoalRow: GoalRow | null = extraGoals.find((g: GoalRow) => g.type === "youtube_member") ?? null

  return (
    <div className="min-h-screen">
      <AppHeader displayName={session.displayName} />
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-zinc-500 text-sm mt-1">Track and manage your streaming goals.</p>
        </div>
        <GoalsClient
          subGoal={subGoalRow?.goal ?? 100}
          subInitialCount={subGoalRow?.initialCount ?? 0}
          subEndsAt={subGoalRow?.endsAt?.toISOString() ?? null}
          subTotal={subTotalRows[0]?.total ?? 0}
          hasTwitch={hasTwitch}
          hasYouTube={hasYouTube}
          followTotal={followTotalRows[0]?.total ?? 0}
          followGoal={followGoalRow?.goal ?? null}
          followEndsAt={followGoalRow?.endsAt?.toISOString() ?? null}
          ytMemberTotal={ytMemberTotalRows[0]?.total ?? 0}
          ytMemberGoal={ytMemberGoalRow?.goal ?? null}
          ytMemberEndsAt={ytMemberGoalRow?.endsAt?.toISOString() ?? null}
        />
      </main>
    </div>
  )
}
