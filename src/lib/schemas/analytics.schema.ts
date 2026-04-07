import { z } from 'zod'

export const AnalyticsRangeSchema = z.enum(['7d', '30d', '90d'])