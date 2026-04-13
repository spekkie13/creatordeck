import { NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { requireSession } from '@/lib/session-auth'
import { linkedAccountsRepository } from '@/repositories'
import { youtubeService } from '@/services'
import { PLATFORM_YOUTUBE } from '@/types/platform'

export const runtime = 'nodejs'

export async function GET() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  if (!session.youtubeChannelId) return apiError(403, 'No YouTube account linked')

  const account = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_YOUTUBE)
  if (!account) return apiError(404, 'YouTube account not found')

  let accessToken = account.accessToken!

  const fetchBroadcasts = (token: string) =>
    fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=all&maxResults=5', {
      headers: { Authorization: `Bearer ${token}` },
    })

  let res = await fetchBroadcasts(accessToken)

  if (res.status === 401 && account.refreshToken) {
    const newToken = await youtubeService.refreshYouTubeToken(account.refreshToken)
    if (!newToken) return apiError(500, 'Token refresh failed')
    await linkedAccountsRepository.updateAccessToken(PLATFORM_YOUTUBE, account.providerAccountId, newToken)
    res = await fetchBroadcasts(newToken)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)')
    return apiError(500, `liveBroadcasts ${res.status}: ${body}`)
  }

  const data = await res.json()
  const broadcasts = (data.items ?? []).map((item: any) => ({
    broadcastId: item.id,
    title: item.snippet?.title,
    liveChatId: item.snippet?.liveChatId,
    status: item.snippet?.liveBroadcastContent,
  }))

  return NextResponse.json({ broadcasts })
}