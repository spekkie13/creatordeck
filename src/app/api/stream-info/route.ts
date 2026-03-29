import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { linkedAccountsRepository } from "@/repositories"
import { streamInfoService } from "@/services/stream-info.service"
import type { StreamInfo } from "@/types/stream"
import { PLATFORM_TWITCH } from "@/types/platform"

const OFFLINE: StreamInfo = { isLive: false, title: null, category: null, viewerCount: null, startedAt: null }

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const broadcasterId = session.twitchId ?? ""
  if (!broadcasterId) return NextResponse.json(OFFLINE)

  const linkedAccounts = await linkedAccountsRepository.findByUserId(session.userId)
  const twitchAccount = linkedAccounts.find(a => a.provider === PLATFORM_TWITCH)
  if (!twitchAccount?.accessToken) return NextResponse.json(OFFLINE)

  const info = await streamInfoService.fetchStreamInfo(broadcasterId, twitchAccount.accessToken)
  return NextResponse.json(info)
}
