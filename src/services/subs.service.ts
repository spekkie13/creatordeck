import { linkedAccountsRepository, subEventsRepository } from '@/repositories'
import type { SubEvent } from '@/types/entities'

class SubsService {
  async getSubEvents(userId: string, since?: Date): Promise<SubEvent[]> {
    const accounts = await linkedAccountsRepository.findByUserId(userId)
    const twitchAccount = accounts.find(a => a.provider === 'twitch')
    if (!twitchAccount) return []

    return subEventsRepository.findByBroadcasterId(twitchAccount.providerAccountId, since)
  }
}

export const subsService = new SubsService()
