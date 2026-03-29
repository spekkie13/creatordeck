import { db } from "@/lib/db"
import { waitlist } from "@/lib/schema"

class WaitlistRepository {
  async insert(email: string, twitchLogin?: string, interestedTier?: string): Promise<void> {
    await db.insert(waitlist).values({ email, twitchLogin: twitchLogin ?? null, interestedTier: interestedTier ?? null }).onConflictDoNothing()
  }
}

export const waitlistRepository = new WaitlistRepository()
