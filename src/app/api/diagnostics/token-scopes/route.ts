import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { PLATFORM_TWITCH } from "@/types/platform"

import { authOptions } from "@/lib/auth"

import { linkedAccountsRepository } from "@/repositories"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const linkedAccounts = await linkedAccountsRepository.findByUserId(session.userId)
  const twitchAccount = linkedAccounts.find(a => a.provider === PLATFORM_TWITCH)
  if (!twitchAccount?.accessToken) return NextResponse.json({ error: "No Twitch token found" }, { status: 404 })

  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${twitchAccount.accessToken}` },
  })

  if (!res.ok) return NextResponse.json({ error: "Token validation failed", status: res.status }, { status: 502 })

  const data = await res.json()
  return NextResponse.json({ scopes: data.scopes, login: data.login, expires_in: data.expires_in })
}
