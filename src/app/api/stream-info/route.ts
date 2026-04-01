import { NextResponse } from "next/server"

import type { StreamInfo } from "@/types/stream"
import { PLATFORM_TWITCH } from "@/types/platform"

import { requireSession } from "@/lib/session-auth"

import { linkedAccountsRepository } from "@/repositories"

import { streamInfoService } from "@/services/stream-info.service"

const OFFLINE: StreamInfo = { isLive: false, title: null, category: null, viewerCount: null, startedAt: null }

export async function GET() {
  const result = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const broadcasterId = session.twitchId ?? ""
  if (!broadcasterId) return NextResponse.json(OFFLINE)

  const twitchAccount = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_TWITCH)
  if (!twitchAccount?.accessToken) return NextResponse.json(OFFLINE)

  const info = await streamInfoService.fetchStreamInfo(broadcasterId, twitchAccount.accessToken)
  return NextResponse.json(info)
}
