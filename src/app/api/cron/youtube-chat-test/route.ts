import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { requireSession } from '@/lib/session-auth'
import { linkedAccountsRepository } from '@/repositories'
import { youtubeService } from '@/services'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  if (!session.youtubeChannelId) return apiError(403, 'No YouTube account linked')

  const liveChatId = req.nextUrl.searchParams.get('liveChatId')
  if (!liveChatId) {
    return apiError(400, 'Missing liveChatId query param')
  }

  const account = await linkedAccountsRepository.findByProvider('youtube', session.youtubeChannelId)
  if (!account) return apiError(404, 'No YouTube account linked')

  let accessToken = account.accessToken!

  const ytUrl = `https://www.googleapis.com/youtube/v3/liveChatMessages?part=snippet,authorDetails&liveChatId=${encodeURIComponent(liveChatId)}&maxResults=2000`

  const doFetch = (token: string) =>
    fetch(ytUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

  let res = await doFetch(accessToken)

  if (res.status === 401 && account.refreshToken) {
    const newToken = await youtubeService.refreshYouTubeToken(account.refreshToken)
    if (!newToken) return apiError(500, 'Token refresh failed')
    await linkedAccountsRepository.updateAccessToken('youtube', account.providerAccountId, newToken)
    accessToken = newToken
    res = await doFetch(accessToken)
  }

  const body = await res.json().catch(() => null)

  // Sanity check: verify the token works for a basic YouTube call
  const channelsRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const channelsBody = await channelsRes.json().catch(() => null)

  return NextResponse.json({
    status: res.status,
    url: ytUrl,
    account: account.providerAccountId,
    tokenPrefix: accessToken.slice(0, 10) + '...',
    body,
    channelsSanityCheck: { status: channelsRes.status, body: channelsBody },
  })
}