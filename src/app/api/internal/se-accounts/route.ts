import { NextRequest, NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { apiError } from '@/lib/api-response'

import { linkedAccountsRepository } from '@/repositories'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${env.bridgeSecret}`) {
    return apiError(401, 'Unauthorized')
  }

  const accounts = await linkedAccountsRepository.findAllByProvider('streamelements')

  return NextResponse.json({
    accounts: accounts.map(a => ({
      channelId: a.providerAccountId,
      jwtToken: a.accessToken,
    })),
  })
}
