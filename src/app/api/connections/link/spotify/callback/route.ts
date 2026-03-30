import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { env } from "@/lib/env"

import { linkedAccountsRepository } from "@/repositories"

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL)!.replace(/\/$/, "")

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=missing_params`)
  }

  const cookieStore = cookies()
  const linkStateCookie = cookieStore.get("spotify_link_state")
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
  } catch {
    return NextResponse.redirect(`${BASE_URL}/connections?error=invalid_state`)
  }

  // Exchange code for tokens
  const credentials = Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString("base64")
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      redirect_uri: `${BASE_URL}/api/connections/link/spotify/callback`,
      grant_type: "authorization_code",
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=token_exchange_failed`)
  }

  // Fetch Spotify user profile
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileRes.json()
  if (!profile.id) {
    return NextResponse.redirect(`${BASE_URL}/connections?error=token_exchange_failed`)
  }

  try {
    await linkedAccountsRepository.upsertForUser(userId, {
      provider: "spotify",
      providerAccountId: profile.id,
      login: profile.id,
      displayName: profile.display_name ?? profile.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? "",
    })
  } catch {
    return NextResponse.redirect(`${BASE_URL}/connections?error=account_conflict`)
  }

  const response = NextResponse.redirect(`${BASE_URL}/connections?linked=spotify`)
  response.cookies.delete("spotify_link_state")
  return response
}
