import type { Session } from "next-auth"

import type { LiveEvent } from "@/types/events"

export type DashboardProps = {
    session: Session
    goal: number
    initialCount: number
    endsAt: string | null
    total: number
    initialEvents: LiveEvent[]
    subscriptionsRegistered: boolean
    followerCount: number | null
    subCount: number | null
    ytSubCount: number | null
    hasYouTube: boolean
    followerGrowth: number
    subGrowth: number
    followTotal: number
    followGoal: number | null
    ytMemberTotal: number
    ytMemberGoal: number | null
    twitchIsLive: boolean
    ytIsLive: boolean
    ytLiveTitle: string | null
}
