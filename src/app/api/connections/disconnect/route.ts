import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"

import { linkedAccountsRepository } from "@/repositories"
import { PLATFORM_SPOTIFY, PLATFORM_STREAMELEMENTS, PLATFORM_TWITCH, PLATFORM_YOUTUBE } from "@/types/platform"
import { LinkedAccount } from "@/types/entities"
import { northflankService } from "@/services/northflank.service"

const ALLOWED_PROVIDERS = [PLATFORM_YOUTUBE, PLATFORM_TWITCH, PLATFORM_SPOTIFY, PLATFORM_STREAMELEMENTS]

export async function POST(req: Request) {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const { provider } = await req.json() as { provider: string }
  if (!provider || !ALLOWED_PROVIDERS.includes(provider)) {
    return apiError(400, 'Invalid provider')
  }

  // Prevent disconnecting the only linked account — user would be locked out
  const allAccounts: LinkedAccount[] = await linkedAccountsRepository.findByUserId(session.userId)
  if (allAccounts.length <= 1) {
    return apiError(400, 'Cannot disconnect your only linked account')
  }

  if (provider === PLATFORM_STREAMELEMENTS) {
    const seAccount = allAccounts.find(a => a.provider === PLATFORM_STREAMELEMENTS)
    await linkedAccountsRepository.deleteByUserIdAndProvider(session.userId, provider)
    if (seAccount) {
      northflankService.deregisterChannel(seAccount.providerAccountId).catch(err =>
        console.error('[disconnect] NorthFlank deregistration failed for channel', seAccount.providerAccountId, err),
      )
    }
  } else {
    await linkedAccountsRepository.deleteByUserIdAndProvider(session.userId, provider)
  }

  return new Response(null, { status: 204 })
}
