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

  const result = await youtubeService.pollAllAccounts()

  if (!result.ok) {
    return NextResponse.json({ ok: false, accounts: result.accounts, errors: result.errors }, { status: 500 })
  }

  return NextResponse.json({ ok: true, accounts: result.accounts })
}
