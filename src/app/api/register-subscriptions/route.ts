import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { twitchEventSubService } from "@/services"
import { eventSubSubscriptionsRepository, linkedAccountsRepository } from "@/repositories"
import { PLATFORM_TWITCH } from "@/types/platform"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const linkedAccounts = await linkedAccountsRepository.findByUserId(session.userId)
  const twitchAccount = linkedAccounts.find(a => a.provider === PLATFORM_TWITCH)
  const userToken = twitchAccount?.accessToken ?? undefined

  const results = await twitchEventSubService.registerSubscriptions(session.twitchId, userToken)

  for (const sub of results) {
    await eventSubSubscriptionsRepository.insert({ id: sub.id, broadcasterId: session.twitchId, type: sub.type, status: sub.status })
  }

  return NextResponse.json({ subscriptions: results })
}
