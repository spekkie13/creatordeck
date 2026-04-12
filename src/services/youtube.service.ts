import type { LinkedAccount, YtStreamSession } from '@/types/entities'

import { env } from '@/lib/env'

import {
  linkedAccountsRepository,
  ytSuperChatEventsRepository,
  ytMemberEventsRepository,
  ytStreamSessionsRepository,
  chatMessagesRepository,
} from '@/repositories'

type PollError = { account: string; error: string }

class YoutubeService {
  async fetchYouTubeSubCount(
    accessToken: string,
    refreshToken: string | null,
    channelId: string,
  ): Promise<number | null> {
    const doFetch = (token: string) =>
      fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true', {
        headers: { Authorization: `Bearer ${token}` },
      })

    try {
      let res: Response = await doFetch(accessToken)

      if (res.status === 401 && refreshToken) {
        const newToken = await this.refreshYouTubeToken(refreshToken)
        if (!newToken) return null
        await linkedAccountsRepository.updateAccessToken('youtube', channelId, newToken)
        res = await doFetch(newToken)
      }

      if (!res.ok) return null
      const data = await res.json()
      const raw = data.items?.[0]?.statistics?.subscriberCount
      return raw !== undefined ? parseInt(raw) : null
    } catch { return null }
  }

  async refreshYouTubeToken(refreshToken: string): Promise<string | null> {
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
      return data.access_token ?? null
    } catch { return null }
  }

  async getChatMessagesSince(channelId: string, since: Date) {
    return chatMessagesRepository.getSince(channelId, since)
  }

  async pollAllAccounts(): Promise<{ ok: boolean; accounts: number; errors: PollError[] }> {
    const accounts = await linkedAccountsRepository.findAllByProvider('youtube')
    console.log(`[yt-poll] found ${accounts.length} account(s)`)

    const results = await Promise.allSettled(accounts.map(a => this.pollAccount(a)))
    const errors: PollError[] = results
      .map((r, i) => r.status === 'rejected' ? { account: accounts[i].providerAccountId, error: String(r.reason) } : null)
      .filter((e): e is PollError => e !== null)

    if (errors.length > 0) {
      console.error(`[yt-poll] ${errors.length} account(s) failed:`, errors)
    }

    return { ok: errors.length === 0, accounts: accounts.length, errors }
  }

  async pollAccount(account: LinkedAccount): Promise<void> {
    let accessToken = account.accessToken!

    const broadcastsUrl = 'liveBroadcasts?part=id,snippet,status&broadcastStatus=active'
    let broadcastsRes = await this.ytGet(broadcastsUrl, accessToken)

    if (broadcastsRes.status === 401 && account.refreshToken) {
      console.log(`[yt-poll] ${account.providerAccountId}: token expired, refreshing`)
      const newToken = await this.refreshYouTubeToken(account.refreshToken)
      if (!newToken) {
        console.log(`[yt-poll] ${account.providerAccountId}: token refresh failed, skipping`)
        return
      }
      await linkedAccountsRepository.updateAccessToken('youtube', account.providerAccountId, newToken)
      accessToken = newToken
      broadcastsRes = await this.ytGet(broadcastsUrl, accessToken)
    }

    if (!broadcastsRes.ok) {
      const body = await broadcastsRes.text().catch((err) => {
        console.error(`[yt-poll] ${account.providerAccountId}: failed to read error body:`, err)
        return '(unreadable)'
      })
      console.error(`[yt-poll] ${account.providerAccountId}: broadcasts fetch failed with status ${broadcastsRes.status}: ${body}`)
      throw new Error(`broadcasts fetch ${broadcastsRes.status}: ${body}`)
    }

    const broadcastsData = await broadcastsRes.json()
    const broadcast = broadcastsData.items?.[0]
    console.log(`[yt-poll] ${account.providerAccountId}: broadcast=${broadcast?.id ?? 'none'}, type=${broadcast?.snippet?.broadcastType ?? '??'}, liveChatId=${broadcast?.snippet?.liveChatId ?? 'MISSING'}, status=${broadcast?.status?.lifeCycleStatus ?? '?'}`)

    if (!broadcast) {
      await ytStreamSessionsRepository.closeByChannelId(account.providerAccountId, new Date())
      return
    }

    const actualStart = broadcast.snippet?.actualStartTime
    await ytStreamSessionsRepository.openIfNew(
      account.providerAccountId,
      broadcast.id,
      broadcast.snippet?.title ?? null,
      actualStart ? new Date(actualStart) : new Date(),
    )

    if (broadcast.snippet?.liveChatId) {
      await ytStreamSessionsRepository.updateLiveChatId(account.providerAccountId, broadcast.snippet.liveChatId)
    }
  }

  async pollChatForAllAccounts(): Promise<{ ok: boolean; errors: PollError[] }> {
    const sessions = await ytStreamSessionsRepository.findAllOpenWithChatId()
    if (sessions.length === 0) return { ok: true, errors: [] }

    const accounts = await linkedAccountsRepository.findAllByProvider('youtube')
    const accountMap = new Map(accounts.map(a => [a.providerAccountId, a]))

    const results = await Promise.allSettled(
      sessions.map(session => {
        const account = accountMap.get(session.channelId)
        if (!account) return Promise.resolve()
        return this.pollChatForSession(account, session)
      })
    )

    const errors: PollError[] = results
      .map((r, i) => r.status === 'rejected' ? { account: sessions[i].channelId, error: String(r.reason) } : null)
      .filter((e): e is PollError => e !== null)

    if (errors.length > 0) {
      console.error(`[yt-chat] ${errors.length} session(s) failed:`, errors)
    }

    return { ok: errors.length === 0, errors }
  }

  private async pollChatForSession(account: LinkedAccount, session: YtStreamSession): Promise<void> {
    let accessToken = account.accessToken!

    const params = new URLSearchParams({
      part: 'snippet,authorDetails',
      liveChatId: session.liveChatId!,
      maxResults: '2000',
    })
    if (session.chatPageToken) params.set('pageToken', session.chatPageToken)

    let res = await this.ytGet(`liveChatMessages?${params}`, accessToken)

    if (res.status === 401 && account.refreshToken) {
      const newToken = await this.refreshYouTubeToken(account.refreshToken)
      if (!newToken) return
      await linkedAccountsRepository.updateAccessToken('youtube', account.providerAccountId, newToken)
      accessToken = newToken
      res = await this.ytGet(`liveChatMessages?${params}`, accessToken)
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable)')
      console.warn(`[yt-chat] ${account.providerAccountId}: liveChatMessages failed ${res.status}: ${body}`)
      return
    }

    const data = await res.json()
    const nextPageToken: string | undefined = data.nextPageToken
    const items: any[] = data.items ?? []

    console.log(`[yt-chat] ${account.providerAccountId}: ${items.length} message(s), nextPageToken=${nextPageToken ?? 'none'}`)

    const textMessages = items.filter((item: any) => item.snippet?.type === 'textMessageEvent')

    await Promise.all(
      textMessages.map((item: any) =>
        chatMessagesRepository.insert({
          platform: 'youtube',
          channelId: account.providerAccountId,
          eventId: item.id,
          userId: item.snippet?.authorChannelId ?? null,
          userDisplayName: item.authorDetails?.displayName ?? null,
          message: item.snippet?.textMessageDetails?.messageText ?? '',
          occurredAt: new Date(item.snippet.publishedAt),
        })
      )
    )

    if (nextPageToken) {
      await ytStreamSessionsRepository.updateChatState(account.providerAccountId, session.liveChatId!, nextPageToken)
    }
  }

  private ytGet(path: string, accessToken: string): Promise<Response> {
    return fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }
}

export const youtubeService = new YoutubeService()
