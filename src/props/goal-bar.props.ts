import {LiveEvent} from "@/types/events";
import {SimpleGoal, SubGoal} from "@/types/goal";
import {StreamInfo} from "@/types/stream";

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
