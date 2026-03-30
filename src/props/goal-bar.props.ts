import type { LiveEvent } from "@/types/events"
import type { SimpleGoal, SubGoal } from "@/types/goal"
import type { StreamInfo } from "@/types/stream"

export type GoalBarProps = {
    displayName: string
    twitchLogin: string
    hasYouTube: boolean
    hasSpotify: boolean
    initialStreamInfo: StreamInfo
    initialEvents: LiveEvent[]
    subGoal: SubGoal | null
    subTotal: number
    followGoal: SimpleGoal | null
    followTotal: number
    ytMemberGoal: SimpleGoal | null
    ytMemberTotal: number
}
