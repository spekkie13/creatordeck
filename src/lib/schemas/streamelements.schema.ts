import { z } from 'zod'

export const IncomingChatMessageSchema = z.object({
  id: z.string(),
  userDisplayName: z.string(),
  userId: z.string().nullable(),
  message: z.string(),
  occurredAt: z.string(),
})

export const YoutubeChatIngestSchema = z.object({
  channelId: z.string(),
  messages: z.array(IncomingChatMessageSchema).min(1),
})

export type IncomingChatMessage = z.infer<typeof IncomingChatMessageSchema>