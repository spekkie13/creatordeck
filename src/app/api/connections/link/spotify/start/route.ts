import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { env } from "@/lib/env"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL)!.replace(/\/$/, "")

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) {
    return NextResponse.redirect(new URL("/", APP_URL))
  }

  const state = randomBytes(16).toString("base64url")

  const params = new URLSearchParams({
    client_id: env.spotifyClientId,
    redirect_uri: `${APP_URL}/api/connections/link/spotify/callback`,
    response_type: "code",
    scope: "user-read-playback-state user-modify-playback-state user-read-currently-playing",
    state,
  })

  const response = NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params}`
  )

  response.cookies.set(
    "spotify_link_state",
    JSON.stringify({ state, userId: session.userId }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    }
  )

  return response
}
