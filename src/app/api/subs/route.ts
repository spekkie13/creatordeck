import { NextRequest, NextResponse } from "next/server"
import { linkedAccountsRepository, subEventsRepository } from "@/repositories"
import { validateApiKey } from "@/lib/api-auth"
import { PLATFORM_TWITCH } from "@/types/platform"
import {LinkedAccount, SubEvent} from "@/types/entities"
import {ApiAuthResult} from "@/types/session";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const result: ApiAuthResult = await validateApiKey(req)
  if (result instanceof NextResponse) return result
  const { user } = result

  const since: string | null = req.nextUrl.searchParams.get("since")

  const twitchAccount: LinkedAccount | null = await linkedAccountsRepository.findByUserIdAndProvider(user.id, PLATFORM_TWITCH)
  if (!twitchAccount)
    return NextResponse.json({ events: [] })

  const events: SubEvent[] = await subEventsRepository.findByBroadcasterId(
      twitchAccount.providerAccountId,
      since
          ? new Date(since)
          : undefined
  )

  return NextResponse.json({ events })
}
