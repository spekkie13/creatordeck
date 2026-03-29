import { streamSessionRepository } from "@/repositories/stream-session.repository"
import {StreamSession} from "@/types/entities";

class StreamSessionService {
  async handleOnline(broadcasterId: string, occurredAt: Date) : Promise<void> {
    const open: StreamSession | null = await streamSessionRepository.findOpen(broadcasterId)
    if (open) {
      // Close any stale session (offline event was missed for a previous stream)
      await streamSessionRepository.close(broadcasterId, occurredAt)
    }
    await streamSessionRepository.create(broadcasterId, occurredAt)
  }

  async handleOffline(broadcasterId: string, occurredAt: Date) : Promise<void> {
    await streamSessionRepository.close(broadcasterId, occurredAt)
  }
}

export const streamSessionService = new StreamSessionService()
