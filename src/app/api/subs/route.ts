import { NextRequest, NextResponse } from "next/server"
import { userRepository, linkedAccountsRepository, subEventsRepository } from "@/repositories"

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key") ?? req.nextUrl.searchParams.get("key") ?? ""
  const since = req.nextUrl.searchParams.get("since")

  if (!apiKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 })

  const user = await userRepository.findByApiKey(apiKey)
  if (!user) return NextResponse.json({ error: "Invalid API key" }, { status: 401 })

  const accounts = await linkedAccountsRepository.findByUserId(user.id)
  const twitchAccount = accounts.find(a => a.provider === "twitch")
  if (!twitchAccount) return NextResponse.json({ events: [] })

  const events = await subEventsRepository.findByBroadcasterId(twitchAccount.providerAccountId, since ? new Date(since) : undefined)
  return NextResponse.json({ events })
}
