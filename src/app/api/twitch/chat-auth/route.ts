import { NextResponse } from "next/server"

import { requireSession } from "@/lib/session-auth"
import { apiError } from "@/lib/api-response"

import { linkedAccountsRepository } from "@/repositories"
import { PLATFORM_TWITCH } from "@/types/platform"
import {SessionResult} from "@/types/session";
import {LinkedAccount} from "@/types/entities";

export async function GET(): Promise<Response> {
  const result: SessionResult = await requireSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const twitchAccount: LinkedAccount | null = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_TWITCH)
  if (!twitchAccount?.accessToken)
    return apiError(404, 'No Twitch account')

  return NextResponse.json({
    token: twitchAccount.accessToken,
    login: twitchAccount.login ?? twitchAccount.displayName ?? "",
  })
}
