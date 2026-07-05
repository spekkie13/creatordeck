import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { randomBytes, createHash } from "crypto"

import { env } from "@/lib/env"
import { authOptions } from "@/lib/auth"
import { hasYouTubeAccess } from "@/lib/youtube-gate"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL)!.replace(/\/$/, "")

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.userId) {
    return NextResponse.redirect(new URL("/", APP_URL))
  }
  // Interim Pro gate — YouTube is owner-only until billing ships requirePro.
  // Defense-in-depth: the connect button is locked for non-admins in the UI.
  if (!hasYouTubeAccess(session)) {
    return NextResponse.redirect(new URL("/connections", APP_URL))
  }

  const state = randomBytes(16).toString("base64url")
  const codeVerifier = randomBytes(32).toString("base64url")
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url")

  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: `${APP_URL}/api/connections/link/google/callback`,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  const response = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )

  response.cookies.set(
    "yt_link_state",
    JSON.stringify({ state, userId: session.userId, codeVerifier }),
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
