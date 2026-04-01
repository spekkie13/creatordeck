import type { GoalType } from "@/repositories/goals.repository"

import { subEventsRepository, followEventsRepository, ytMemberEventsRepository, subGoalsRepository, goalsRepository } from "@/repositories"

import type { WidgetGoalData } from "@/services/widget-goal.types"
import {PLATFORM_TWITCH, PLATFORM_YOUTUBE} from "@/types/platform";

class WidgetGoalService {
  async getGoalData(
    userId: string,
    broadcasterId: string,
    channelId: string,
    type: string,
  ): Promise<WidgetGoalData | null> {
    if (type === "twitch_sub") {
      if (!broadcasterId) return null
      const [goalRow, total] = await Promise.all([
        subGoalsRepository.findByBroadcasterId(broadcasterId),
        subEventsRepository.countByBroadcasterId(broadcasterId),
      ])
      const goal = goalRow?.goal ?? 100
      const current = total + (goalRow?.initialCount ?? 0)
      return { current, goal, label: "Subscribers", platform: PLATFORM_TWITCH }
    }

    if (type === "twitch_follow") {
      if (!broadcasterId) return null
      const [goalRow, current] = await Promise.all([
        goalsRepository.findByUserIdAndType(userId, "twitch_follow" as GoalType),
        followEventsRepository.countByBroadcasterId(broadcasterId),
      ])
      return { current, goal: goalRow?.goal ?? 100, label: "Followers", platform: PLATFORM_TWITCH }
    }

    if (type === "youtube_member") {
      if (!channelId) return null
      const [goalRow, current] = await Promise.all([
        goalsRepository.findByUserIdAndType(userId, "youtube_member" as GoalType),
        ytMemberEventsRepository.countByChannelId(channelId),
      ])
      return { current, goal: goalRow?.goal ?? 100, label: "Members", platform: PLATFORM_YOUTUBE }
    }

    return null
  }
}

export const widgetGoalService = new WidgetGoalService()
