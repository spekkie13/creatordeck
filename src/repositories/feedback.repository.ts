import { db } from "@/lib/db"
import { feedback } from "@/lib/schema"

class FeedbackRepository {
  async insert(userId: string, message: string): Promise<void> {
    await db.insert(feedback).values({ userId, message })
  }
}

export const feedbackRepository = new FeedbackRepository()