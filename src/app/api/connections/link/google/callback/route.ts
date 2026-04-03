import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { env } from "@/lib/env"

import { linkedAccountsRepository } from "@/repositories"

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL)!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=missing_params`)
  }

  // Verify state cookie
  const cookieStore = await cookies()
  const linkStateCookie = cookieStore.get("yt_link_state")
  if (!linkStateCookie) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
  }

  let userId: string
  try {
    const parsed = JSON.parse(linkStateCookie.value)
    if (parsed.state !== state) {
      return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
    }
    userId = parsed.userId
  } catch (err) {
    console.error("[google/callback] Failed to parse state cookie:", err)
    return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
  }

  const { codeVerifier } = JSON.parse(linkStateCookie.value)

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: `${BASE_URL}/api/connections/link/google/callback`,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=token_exchange_failed`)
  }

  // Fetch YouTube channel
  const channelRes = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  )
  const channelData = await channelRes.json()
  const channel = channelData.items?.[0]

  if (!channel) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=no_youtube_channel`)
  }

  const channelId: string = channel.id
  const displayName: string = channel.snippet?.title ?? channelId

  // Link to existing user
  try {
    await linkedAccountsRepository.upsertForUser(userId, {
      provider: "youtube",
      providerAccountId: channelId,
      login: channelId,
      displayName,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
    })
  } catch (err) {
    console.error("[google/callback] Failed to upsert linked account for userId", userId, err)
    return NextResponse.redirect(`${BASE_URL}/connections?error=account_conflict`)
  }

  // Clear the state cookie and redirect — client will call session.update()
  const response = NextResponse.redirect(`${BASE_URL}/connections?linked=youtube`)
  response.cookies.delete("yt_link_state")
  return response
}
