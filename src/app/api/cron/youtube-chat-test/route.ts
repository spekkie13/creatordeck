import { NextRequest, NextResponse } from 'next/server'

import { apiError } from '@/lib/api-response'
import { requireSession } from '@/lib/session-auth'

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

  const data = await youtubeService.pollChatWithId(liveChatId)
  return NextResponse.json({ ok: true, ...data })
}