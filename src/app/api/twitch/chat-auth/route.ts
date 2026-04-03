import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { apiError } from "@/lib/api-response"

import { linkedAccountsRepository } from "@/repositories"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) return apiError(401, 'Unauthorized')

  const accounts = await linkedAccountsRepository.findByUserId(session.userId)
  const twitchAccount = accounts.find(a => a.provider === "twitch")
  if (!twitchAccount?.accessToken) return apiError(404, 'No Twitch account')

  return NextResponse.json({
    token: twitchAccount.accessToken,
    login: twitchAccount.login ?? twitchAccount.displayName ?? "",
  })
}