"use client"
import Link from "next/link"
import {TwitchLogo, YouTubeLogo} from "@/components";
import {GoalsClientProps} from "@/props/goals-client.props";
import {GoalCard} from "@/app/goals/goal-card";

export function GoalsClient({
  subGoal, subInitialCount, subEndsAt, subTotal,
  hasTwitch, hasYouTube,
  followTotal, followGoal, followEndsAt,
  ytMemberTotal, ytMemberGoal, ytMemberEndsAt,
}: GoalsClientProps) {
  return (
    <div className="space-y-6">
      {hasTwitch && (
        <GoalCard
          label="Twitch — Subscribers"
          logo={<TwitchLogo className="w-4 h-4 text-[#9146FF]" />}
          total={subTotal}
          savedGoal={subGoal}
          endsAt={subEndsAt}
          accentColor="bg-teal-500"
          initialCount={subInitialCount}
        />
      )}

      {hasTwitch && (
        <GoalCard
          label="Twitch — Followers"
          logo={<TwitchLogo className="w-4 h-4 text-[#9146FF]" />}
          total={followTotal}
          savedGoal={followGoal}
          endsAt={followEndsAt}
          accentColor="bg-blue-500"
          apiType="twitch_follow"
        />
      )}

      {hasYouTube && (
        <GoalCard
          label="YouTube — Members"
          logo={<YouTubeLogo className="w-4 h-4 text-[#FF0000]" />}
          total={ytMemberTotal}
          savedGoal={ytMemberGoal}
          endsAt={ytMemberEndsAt}
          accentColor="bg-red-500"
          apiType="youtube_member"
        />
      )}

      {!hasYouTube && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <YouTubeLogo className="w-4 h-4 text-[#FF0000]" />
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">YouTube — Members</h2>
          </div>
          <p className="text-sm text-zinc-500">
            Connect your YouTube account to track membership goals.{" "}
            <Link href="/connections" className="text-teal-500 hover:text-teal-400">Go to Connections →</Link>
          </p>
        </div>
      )}

      <p className="text-xs text-zinc-400 text-center">
        <Link href="/dashboard" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
          ← Back to dashboard
        </Link>
      </p>
    </div>
  )
}
