import { subEventsRepository, followEventsRepository, cheerEventsRepository, raidEventsRepository, ytSuperChatEventsRepository, ytMemberEventsRepository } from "@/repositories"
import type { LiveEvent, LiveEventType } from "@/types/events"
import type { EventFilter, PaginatedEvents } from "@/types/event-filter"
import { mapCheerToEvent, mapFollowToEvent, mapMemberToEvent, mapRaidToEvent, mapSubToEvent, mapSuperchatToEvent } from "@/lib/event-mappers"

class LiveEventFeedService {
  async getFilteredEvents(filter: EventFilter): Promise<PaginatedEvents> {
    const { broadcasterId, youtubeChannelId, types, from, to, sortBy = "occurredAt", sortOrder = "desc", page = 1, limit = 25 } = filter
    const since = from ?? new Date(0)
    const until = to ?? new Date()

    const include = (type: LiveEventType) => !types || types.includes(type)

    const [subs, follows, cheers, raids, superchats, members] = await Promise.all([
      include("sub")       ? subEventsRepository.findInRange(broadcasterId, since, until) : [],
      include("follow")    ? followEventsRepository.findInRange(broadcasterId, since, until) : [],
      include("bits")      ? cheerEventsRepository.findInRange(broadcasterId, since, until) : [],
      include("raid")      ? raidEventsRepository.findInRange(broadcasterId, since, until) : [],
      include("superchat") && youtubeChannelId ? ytSuperChatEventsRepository.findInRange(youtubeChannelId, since, until) : [],
      include("member")    && youtubeChannelId ? ytMemberEventsRepository.findInRange(youtubeChannelId, since, until) : [],
    ])

    const all: LiveEvent[] = [
      ...subs.map(mapSubToEvent),
      ...follows.map(mapFollowToEvent),
      ...cheers.map(mapCheerToEvent),
      ...raids.map(mapRaidToEvent),
      ...superchats.map(mapSuperchatToEvent),
      ...members.map(mapMemberToEvent),
    ]

    all.sort((a, b) => {
      if (sortBy === "amount") {
        const diff = (b.amount ?? 0) - (a.amount ?? 0)
        return sortOrder === "asc" ? -diff : diff
      }
      const diff = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      return sortOrder === "asc" ? -diff : diff
    })

    const total = all.length
    const totalPages = Math.ceil(total / limit)
    const events = all.slice((page - 1) * limit, page * limit)

    return { events, total, page, totalPages }
  }

  async getEventsSince(broadcasterId: string, since: Date, youtubeChannelId?: string | null): Promise<LiveEvent[]> {
    const [subs, follows, cheers, raids, superchats, members] = await Promise.all([
      subEventsRepository.findSince(broadcasterId, since),
      followEventsRepository.findSince(broadcasterId, since),
      cheerEventsRepository.findSince(broadcasterId, since),
      raidEventsRepository.findSince(broadcasterId, since),
      youtubeChannelId ? ytSuperChatEventsRepository.findSince(youtubeChannelId, since) : [],
      youtubeChannelId ? ytMemberEventsRepository.findSince(youtubeChannelId, since) : [],
    ])

    const events: LiveEvent[] = [
      ...subs.map(mapSubToEvent),
      ...follows.map(mapFollowToEvent),
      ...cheers.map(mapCheerToEvent),
      ...raids.map(mapRaidToEvent),
      ...superchats.map(mapSuperchatToEvent),
      ...members.map(mapMemberToEvent),
    ]

    return events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  }
}

export const liveEventFeedService = new LiveEventFeedService()