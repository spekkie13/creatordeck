import { NextRequest, NextResponse } from "next/server"

import { userRepository, linkedAccountsRepository } from "@/repositories"

import { widgetGoalService } from "@/services"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  const type = searchParams.get("type") ?? "twitch_sub"

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 })

  const user = await userRepository.findByWidgetToken(token)
  if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401 })

  const linkedAccounts = await linkedAccountsRepository.findByUserId(user.id)
  const twitchAccount = linkedAccounts.find(a => a.provider === "twitch")
  const ytAccount = linkedAccounts.find(a => a.provider === "youtube")
  const broadcasterId = twitchAccount?.providerAccountId ?? ""
  const channelId = ytAccount?.providerAccountId ?? ""

  const data = await widgetGoalService.getGoalData(user.id, broadcasterId, channelId, type)
  if (!data) return NextResponse.json({ error: "Invalid type or platform not connected" }, { status: 400 })

  return NextResponse.json(data)
}