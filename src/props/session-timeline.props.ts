import type {LiveEvent, LiveEventType} from "@/types/events";

export type SessionTimelineProps = {
    events: LiveEvent[]
    sessionStart: string
    presentTypes: LiveEventType[]
}
