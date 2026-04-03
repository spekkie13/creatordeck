import { z } from 'zod'

import { isValidDate } from './shared'

export const SubsQuerySchema = z.object({
  since: z.string().refine(isValidDate, 'Invalid since date').optional(),
})