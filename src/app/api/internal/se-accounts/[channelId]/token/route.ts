import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { apiError } from '@/lib/api-response'

import { linkedAccountsRepository } from '@/repositories'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> },
) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.northflankWebhookSecret}`) {
    return apiError(401, 'Unauthorized')
  }

  const { channelId } = await params
  const { accessToken } = await req.json() as { accessToken: string }
  if (!accessToken) return apiError(400, 'Missing accessToken')

  await linkedAccountsRepository.updateAccessToken('streamelements', channelId, accessToken)

  return NextResponse.json({ ok: true })
}
