import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"

import {
  linkedAccountsRepository,
  ytSuperChatEventsRepository,
  ytMemberEventsRepository,
  ytStreamSessionsRepository,
} from "@/repositories"
import { youtubeService } from "@/services"
import { PLATFORM_SPOTIFY, PLATFORM_TWITCH, PLATFORM_YOUTUBE } from "@/types/platform"
import { LinkedAccount } from "@/types/entities"
const ALLOWED_PROVIDERS = [PLATFORM_YOUTUBE, PLATFORM_TWITCH, PLATFORM_SPOTIFY]

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

  // Revoke the Google grant before deleting the row (spec §3.4). Best-effort:
  // revocation failures must not block the disconnect. We also erase the YouTube
  // data we have stored for this channel, as promised in the Privacy Policy
  // (keyed by channelId === providerAccountId, as in account deletion).
  if (provider === PLATFORM_YOUTUBE) {
    await youtubeService.revokeAccess(session.userId)

    const youtube = allAccounts.find((a) => a.provider === PLATFORM_YOUTUBE)
    if (youtube) {
      const channelId = youtube.providerAccountId
      await ytSuperChatEventsRepository.deleteByChannelId(channelId)
      await ytMemberEventsRepository.deleteByChannelId(channelId)
      await ytStreamSessionsRepository.deleteByChannelId(channelId)
    }
  }

  await linkedAccountsRepository.deleteByUserIdAndProvider(session.userId, provider)

  return new Response(null, { status: 204 })
}
