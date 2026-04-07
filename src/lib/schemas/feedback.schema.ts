import { z } from 'zod'

export const MAX_FEEDBACK_LENGTH = 2000

export const CreateFeedbackSchema = z.object({
  message: z.string().min(1, 'Message required').max(MAX_FEEDBACK_LENGTH, 'Message too long'),
})