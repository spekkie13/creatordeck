import type { LiveEventType } from "./events"

export type EventSortBy = "occurredAt" | "amount"
export type SortOrder = "asc" | "desc"

export type EventFilter = {
  broadcasterId: string
  youtubeChannelId?: string | null
  types?: LiveEventType[]
  from?: Date
  to?: Date
  sortBy?: EventSortBy
  sortOrder?: SortOrder
  page?: number
  limit?: number
}

export type PaginatedEvents = {
  events: import("./events").LiveEvent[]
  total: number
  page: number
  totalPages: number
}
