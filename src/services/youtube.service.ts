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

export type ActiveBroadcast = {
  id: string
  title: string | null
  liveChatId: string | null
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
   * Detects the user's currently-active live broadcast. Uses ONLY
   * `liveBroadcasts.list?mine=true` (1-unit class) — `search.list` is forbidden
   * for liveness (100 units/call, 100/day hard cap; spec §3.6). Returns the
   * active broadcast (with its live chat id) or null when not live.
   */
  async getActiveBroadcast(accessToken: string): Promise<ActiveBroadcast | null> {
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/liveBroadcasts' +
          '?part=snippet,status&broadcastStatus=active&broadcastType=all&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      if (!res.ok) return null
      const data = await res.json()
      const item = data.items?.[0]
      if (!item) return null
      return {
        id: item.id,
        title: item.snippet?.title ?? null,
        liveChatId: item.snippet?.liveChatId ?? null,
      }
    } catch {
      return null
    }
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