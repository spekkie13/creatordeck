import { env } from '@/lib/env'
import { PLATFORM_YOUTUBE } from '@/types/platform'

import {
  linkedAccountsRepository,
  chatMessagesRepository,
} from '@/repositories'

// Refresh a little before the token actually expires so an in-flight request
// never races the boundary.
const REFRESH_SKEW_MS = 60_000

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

  async getChatMessagesSince(channelId: string, since: Date) {
    return chatMessagesRepository.getSince(channelId, since)
  }
}

export const youtubeService = new YoutubeService()