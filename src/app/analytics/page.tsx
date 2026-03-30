import { getServerSession, Session } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { hasAccess } from "@/lib/gates"

import { analyticsService } from "@/services"
import type { AnalyticsOverview } from "@/services"

import { AnalyticsClient } from "./analytics-client"

export default async function AnalyticsPage() {
  const session: Session | null = await getServerSession(authOptions)
  if (!session) redirect("/")

  const canSeeExtendedHistory: boolean = hasAccess(session.tier, "tier1")
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const data: AnalyticsOverview = await analyticsService.getOverview(
    session.twitchId ?? "",
    session.youtubeChannelId ?? null,
    since,
  )

  return (
    <AnalyticsClient
      initialData={data}
      initialRange="7d"
      hasYouTube={!!session.youtubeChannelId}
      displayName={session.displayName}
      tier={session.tier}
      canSeeExtendedHistory={canSeeExtendedHistory}
    />
  )
}
