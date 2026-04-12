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

  const [broadcastResult, chatResult] = await Promise.all([
    youtubeService.pollAllAccounts(),
    youtubeService.pollChatForAllAccounts(),
  ])

  if (!broadcastResult.ok) {
    return NextResponse.json({ ok: false, accounts: broadcastResult.accounts, errors: broadcastResult.errors }, { status: 500 })
  }

  return NextResponse.json({ ok: true, accounts: broadcastResult.accounts, chatErrors: chatResult.errors })
}
