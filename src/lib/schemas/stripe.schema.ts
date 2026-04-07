import { z } from 'zod'

export const CheckoutSessionPayloadSchema = z.object({
  metadata: z.object({ userId: z.string().min(1) }),
  customer: z.string().min(1),
  subscription: z.string().min(1),
})

export const SubscriptionPayloadSchema = z.object({
  customer: z.string().min(1),
  id: z.string().min(1),
})