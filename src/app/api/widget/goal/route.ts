import { NextRequest, NextResponse } from "next/server"

import { linkedAccountsRepository } from "@/repositories"
import { validateWidgetToken } from "@/lib/widget-auth"

import {WidgetGoalData, widgetGoalService} from "@/services"
import {PLATFORM_TWITCH, PLATFORM_YOUTUBE} from "@/types/platform";
import {WidgetAuthResult} from "@/types/session";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const result: WidgetAuthResult = await validateWidgetToken(req)
  if (result instanceof NextResponse) return result
  const { user } = result

  const { searchParams } = new URL(req.url)
  const type: string = searchParams.get("type") ?? "twitch_sub"

  const [twitchAccount, ytAccount] = await Promise.all([
    linkedAccountsRepository.findByUserIdAndProvider(user.id, PLATFORM_TWITCH),
    linkedAccountsRepository.findByUserIdAndProvider(user.id, PLATFORM_YOUTUBE),
  ])
  const broadcasterId: string = twitchAccount?.providerAccountId ?? ""
  const channelId: string = ytAccount?.providerAccountId ?? ""

  const data: WidgetGoalData | null = await widgetGoalService.getGoalData(user.id, broadcasterId, channelId, type)
  if (!data)
    return NextResponse.json({ error: "Invalid type or platform not connected" }, { status: 400 })

  return NextResponse.json(data)
}
