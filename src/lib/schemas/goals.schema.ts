import { z } from 'zod'

import { isValidDate } from './shared'

export const CreateGoalSchema = z.object({
  type: z.enum(['twitch_follow', 'youtube_member']),
  goal: z.number().int().min(1),
  endsAt: z.string().refine(isValidDate, 'Invalid endsAt date').optional().nullable(),
})

export const CreateSubGoalSchema = z.object({
  goal: z.number().int().min(1),
  initialCount: z.number().int().min(0).optional(),
  endsAt: z.string().refine(isValidDate, 'Invalid endsAt date').optional().nullable(),
})