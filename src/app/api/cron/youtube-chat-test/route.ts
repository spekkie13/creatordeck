import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { apiError } from '@/lib/api-response'

import { youtubeService } from '@/services'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.cronSecret}`) {
    return apiError(401, 'Unauthorized')
  }

  const { searchParams } = new URL(req.url)
  const liveChatId = searchParams.get('liveChatId')
  if (!liveChatId) {
    return apiError(400, 'Missing liveChatId query param')
  }

  const result = await youtubeService.pollChatWithId(liveChatId)
  return NextResponse.json({ ok: true, ...result })
}