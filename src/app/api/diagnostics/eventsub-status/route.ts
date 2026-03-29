import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { env } from "@/lib/env"

async function getAppToken(): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${env.twitchClientId}&client_secret=${env.twitchClientSecret}&grant_type=client_credentials`,
    { method: "POST" },
  )
  const data = await res.json()
  return data.access_token
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.twitchId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const token = await getAppToken()

  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": env.twitchClientId,
    },
  })

  if (!res.ok) {
    return NextResponse.json({ error: "Twitch API error", status: res.status }, { status: 502 })
  }

  const data = await res.json()
  const all: { type: string; status: string; condition: Record<string, string> }[] = data.data ?? []

  const mine = all.filter(s =>
    Object.values(s.condition).includes(session.twitchId!)
  )

  return NextResponse.json({
    total: all.length,
    yours: mine.map(s => ({ type: s.type, status: s.status })),
  })
}
