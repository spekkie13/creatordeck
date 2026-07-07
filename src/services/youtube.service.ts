import { env } from '@/lib/env'
import { PLATFORM_YOUTUBE } from '@/types/platform'
import type { YouTubeLiveChatItem } from '@/lib/youtube-api-mapper'

import { linkedAccountsRepository } from '@/repositories'

// Refresh a little before the token actually expires so an in-flight request
// never races the boundary.
const REFRESH_SKEW_MS = 60_000

/**
 * Placeholder quota cost of one `liveChatMessages.list` call. Google does not
 * publish this (community range 1–5 units); we seed the pessimistic end and will
 * replace it with the Gate 1 spike / Google Cloud console per-method measurement
 * (plan §3.6, Phase 3). Instrumentation must MEASURE, never assume — this is the
 * best available estimate until then.
 */
export const YT_LIST_UNITS_ESTIMATE = 5

/**
 * Estimated quota cost of one broadcast-detection `liveBroadcasts.list mine=true`
 * call. This is a documented 1-unit-class method (spec §3.6), so unlike the
 * `list` cost this estimate is firm. Detection is the realistic quota trap once
 * chat is cheap, so it is counted toward the session's quotaUnits.
 */
export const YT_BROADCAST_UNITS_ESTIMATE = 1

export type ActiveBroadcast = {
  id: string
  title: string | null
  liveChatId: string | null
}

// Liveness endpoint — 1-unit class. `search.list` is forbidden here (100
// units/call, 100/day hard cap; spec §3.6).
//
// NOTE: the historical query `broadcastStatus=active&broadcastType=all&mine=true`
// is INVALID — YouTube rejects it 400 (`broadcastStatus` and `mine` are mutually
// exclusive; `broadcastType` is only valid with `mine`). The silent catch in
// getActiveBroadcast masked this, so detection always returned null in prod. The
// correct query is being pinned empirically via probeBroadcastDetection (the
// `?debug=1` endpoint) before the live path is switched over.
const LIVE_BROADCASTS_BASE =
  'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status&maxResults=50&'

// Lifecycle states in which a broadcast is on-air (or about to be) and has a
// usable live chat — the states detection should treat as "live". `testing`/
// `testStarting` are included because the chat id exists and OBS often sits in
// testing before the auto-transition to `live`.
const LIVE_LIFECYCLE_STATUSES = new Set([
  'live',
  'liveStarting',
  'testing',
  'testStarting',
])

/** One returned broadcast, flattened to just the fields detection cares about. */
export type BroadcastProbeItem = {
  id: string
  lifeCycleStatus: string | null
  privacyStatus: string | null
  liveChatId: string | null
  title: string | null
}

/**
 * Result of one candidate `liveBroadcasts.list` query. `liveItems` are the
 * broadcasts in a live-ish lifecycle (the ones detection would act on); `sample`
 * shows the first few of whatever came back so we can see non-live results too.
 */
export type BroadcastProbe = {
  label: string
  httpStatus: number
  ok: boolean
  itemCount: number
  liveItems: BroadcastProbeItem[]
  sample: BroadcastProbeItem[]
  errorReason?: string
  fetchError?: string
}

export type LiveChatFetchResult =
  | {
      ok: true
      items: YouTubeLiveChatItem[]
      nextPageToken: string | null
      pollingIntervalMillis: number
    }
  | { ok: false; error: 'quota' | 'ended' | 'unknown'; retryAfterMillis?: number }

class YoutubeService {
  /**
   * Returns a currently-valid Google access token for the user's linked YouTube
   * channel, refreshing transparently when the stored token is within
   * REFRESH_SKEW_MS of expiry. Persists the refreshed (encrypted) token + new
   * expiry. Returns null if the channel is unlinked or the refresh token has
   * been revoked (`invalid_grant`) — the caller surfaces this as a
   * reconnect-required state. Token values are never logged.
   */
  async getValidAccessToken(userId: string): Promise<string | null> {
    const tokens = await linkedAccountsRepository.getDecryptedTokens(userId, PLATFORM_YOUTUBE)
    if (!tokens) return null

    const { accessToken, refreshToken, tokenExpiresAt, providerAccountId } = tokens

    const stillValid =
      !!accessToken && !!tokenExpiresAt && tokenExpiresAt.getTime() > Date.now() + REFRESH_SKEW_MS
    if (stillValid) return accessToken

    // No refresh token (legacy row) — best effort with whatever we have.
    if (!refreshToken) return accessToken ?? null

    const refreshed = await this.refreshAccessToken(refreshToken)
    if (!refreshed) return null // invalid_grant / revoked → needs reconnect

    await linkedAccountsRepository.updateAccessToken(
      PLATFORM_YOUTUBE,
      providerAccountId,
      refreshed.accessToken,
      refreshed.expiresAt,
    )
    return refreshed.accessToken
  }

  private async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; expiresAt: Date | null } | null> {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.access_token) return null
      const expiresAt =
        typeof data.expires_in === 'number' ? new Date(Date.now() + data.expires_in * 1000) : null
      return { accessToken: data.access_token, expiresAt }
    } catch {
      return null
    }
  }

  /** Best-effort revocation of the user's Google grant. Never throws. */
  async revokeAccess(userId: string): Promise<void> {
    const tokens = await linkedAccountsRepository.getDecryptedTokens(userId, PLATFORM_YOUTUBE)
    // Prefer the refresh token (revoking it invalidates the whole grant); fall
    // back to the access token.
    const token = tokens?.refreshToken ?? tokens?.accessToken
    if (!token) return
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      })
    } catch {
      // Revocation is best-effort; disconnect proceeds regardless. Never log the token.
    }
  }

  async fetchYouTubeSubCount(userId: string): Promise<number | null> {
    const accessToken = await this.getValidAccessToken(userId)
    if (!accessToken) return null

    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (!res.ok) return null
      const data = await res.json()
      const raw = data.items?.[0]?.statistics?.subscriberCount
      return raw !== undefined ? parseInt(raw) : null
    } catch {
      return null
    }
  }

  /**
   * Detects the user's currently-active live broadcast (1-unit class;
   * `search.list` is forbidden for liveness — 100 units/call, 100/day hard cap;
   * spec §3.6). Queries `mine=true&broadcastType=all` (a valid parameter combo —
   * unlike the old `broadcastStatus=active&mine=true`, which YouTube 400s) and
   * filters to a live-ish lifecycle in code, so persistent stream-key broadcasts
   * are caught too. Returns the active broadcast (with its live chat id) or null
   * when not live.
   */
  async getActiveBroadcast(accessToken: string): Promise<ActiveBroadcast | null> {
    try {
      const res = await fetch(LIVE_BROADCASTS_BASE + 'mine=true&broadcastType=all', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      const items: unknown[] = Array.isArray(data.items) ? data.items : []
      const live = items.find((it) =>
        LIVE_LIFECYCLE_STATUSES.has(
          (it as { status?: { lifeCycleStatus?: string } })?.status?.lifeCycleStatus ?? '',
        ),
      ) as { id?: string; snippet?: { title?: string; liveChatId?: string } } | undefined
      if (!live) return null
      return {
        id: live.id ?? '',
        title: live.snippet?.title ?? null,
        liveChatId: live.snippet?.liveChatId ?? null,
      }
    } catch {
      return null
    }
  }

  /**
   * Owner-only diagnostic. Runs several candidate `liveBroadcasts.list` queries
   * against the same token and reports each one's status + returned broadcasts,
   * so a single live prod call (`/api/youtube/broadcast?debug=1`) pins down which
   * parameter combination actually surfaces the caller's broadcast (esp. the
   * persistent stream-key case). Purely observational: opens/closes no session,
   * mutates no state, and never returns the access token.
   */
  async probeBroadcastDetection(accessToken: string): Promise<BroadcastProbe[]> {
    const candidates = [
      'broadcastStatus=active',
      'broadcastStatus=active&broadcastType=all',
      'mine=true',
      'mine=true&broadcastType=all',
      'mine=true&broadcastType=persistent',
    ]
    const results: BroadcastProbe[] = []
    for (const query of candidates) {
      try {
        const res = await fetch(LIVE_BROADCASTS_BASE + query, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        const text = await res.text()
        let body: unknown = text
        try {
          body = JSON.parse(text)
        } catch {
          // Non-JSON — leave body as raw text; errorReason stays undefined.
        }
        const items: unknown[] = Array.isArray((body as { items?: unknown[] })?.items)
          ? (body as { items: unknown[] }).items
          : []
        const mapped = items.map((it): BroadcastProbeItem => {
          const b = it as {
            id?: string
            status?: { lifeCycleStatus?: string; privacyStatus?: string }
            snippet?: { liveChatId?: string; title?: string }
          }
          return {
            id: b?.id ?? '',
            lifeCycleStatus: b?.status?.lifeCycleStatus ?? null,
            privacyStatus: b?.status?.privacyStatus ?? null,
            liveChatId: b?.snippet?.liveChatId ?? null,
            title: b?.snippet?.title ?? null,
          }
        })
        results.push({
          label: query,
          httpStatus: res.status,
          ok: res.ok,
          itemCount: mapped.length,
          liveItems: mapped.filter(
            (m) => m.lifeCycleStatus && LIVE_LIFECYCLE_STATUSES.has(m.lifeCycleStatus),
          ),
          sample: mapped.slice(0, 3),
          errorReason: (body as { error?: { errors?: { reason?: string }[] } })?.error?.errors?.[0]
            ?.reason,
        })
      } catch (e) {
        results.push({
          label: query,
          httpStatus: 0,
          ok: false,
          itemCount: 0,
          liveItems: [],
          sample: [],
          fetchError: e instanceof Error ? e.message : String(e),
        })
      }
    }
    return results
  }

  /**
   * One `liveChatMessages.list` tick. Returns new messages plus the resume
   * `nextPageToken` and YouTube's demanded `pollingIntervalMillis` (the client
   * MUST honor it, never a hardcoded interval). Maps quota/ended conditions to a
   * typed result so the route can degrade gracefully.
   */
  async fetchLiveChatMessages(
    accessToken: string,
    liveChatId: string,
    pageToken: string | null,
  ): Promise<LiveChatFetchResult> {
    try {
      const params = new URLSearchParams({
        liveChatId,
        part: 'snippet,authorDetails',
      })
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/liveChat/messages?${params}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const reason: string | undefined = body?.error?.errors?.[0]?.reason
        if (reason === 'quotaExceeded' || reason === 'rateLimitExceeded' || res.status === 429) {
          return { ok: false, error: 'quota', retryAfterMillis: 60_000 }
        }
        if (reason === 'liveChatEnded' || reason === 'liveChatNotFound' || res.status === 404) {
          return { ok: false, error: 'ended' }
        }
        return { ok: false, error: 'unknown' }
      }

      const data = await res.json()
      return {
        ok: true,
        items: (data.items ?? []) as YouTubeLiveChatItem[],
        nextPageToken: data.nextPageToken ?? null,
        pollingIntervalMillis:
          typeof data.pollingIntervalMillis === 'number' ? data.pollingIntervalMillis : 5000,
      }
    } catch {
      return { ok: false, error: 'unknown' }
    }
  }

}

export const youtubeService = new YoutubeService()