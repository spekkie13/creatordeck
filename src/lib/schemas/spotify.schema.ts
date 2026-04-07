import { z } from 'zod'

export const SpotifyControlsSchema = z.object({
  action: z.enum(['play', 'pause', 'skip', 'previous', 'volume']),
  volume: z.number().int().min(0).max(100).optional(),
})