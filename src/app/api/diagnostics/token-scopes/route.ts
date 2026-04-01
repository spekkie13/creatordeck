import { NextResponse } from "next/server"

import { PLATFORM_TWITCH } from "@/types/platform"

import { requireTwitchSession } from "@/lib/session-auth"

import { linkedAccountsRepository } from "@/repositories"

export async function GET() {
  const result = await requireTwitchSession()
  if (result instanceof NextResponse) return result
  const { session } = result

  const twitchAccount = await linkedAccountsRepository.findByUserIdAndProvider(session.userId, PLATFORM_TWITCH)
  if (!twitchAccount?.accessToken) return NextResponse.json({ error: "No Twitch token found" }, { status: 404 })

  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${twitchAccount.accessToken}` },
  })

  if (!res.ok) return NextResponse.json({ error: "Token validation failed", status: res.status }, { status: 502 })

  const data = await res.json()
  return NextResponse.json({ scopes: data.scopes, login: data.login, expires_in: data.expires_in })
}
