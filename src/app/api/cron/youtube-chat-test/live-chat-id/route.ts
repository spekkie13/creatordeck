import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { apiError } from '@/lib/api-response'
import { linkedAccountsRepository } from '@/repositories'
import { youtubeService } from '@/services'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.cronSecret}`) {
    return apiError(401, 'Unauthorized')
  }

  const accounts = await linkedAccountsRepository.findAllByProvider('youtube')
  const account = accounts[0]
  if (!account) return apiError(404, 'No YouTube account linked')

  let accessToken = account.accessToken!

  const fetchBroadcasts = (token: string) =>
    fetch('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet&broadcastStatus=all&maxResults=5', {
      headers: { Authorization: `Bearer ${token}` },
    })

  let res = await fetchBroadcasts(accessToken)

  if (res.status === 401 && account.refreshToken) {
    const newToken = await youtubeService.refreshYouTubeToken(account.refreshToken)
    if (!newToken) return apiError(500, 'Token refresh failed')
    await linkedAccountsRepository.updateAccessToken('youtube', account.providerAccountId, newToken)
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
