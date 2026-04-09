import { z } from 'zod'

export const StreamElementsWebhookSchema = z.object({
  channelId: z.string(),
  eventId: z.string(),
  userDisplayName: z.string().nullable(),
  userId: z.string().nullable(),
  message: z.string(),
  occurredAt: z.string(),
})