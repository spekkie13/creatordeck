import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { env } from '@/lib/env'
import { stripe } from '@/lib/stripe'
import { CheckoutSessionPayloadSchema, SubscriptionPayloadSchema } from '@/lib/schemas/stripe.schema'
import { NoStripeCustomerFoundException, UnknownStripePriceException } from '@/lib/exceptions'

import { billingService } from '@/services'

// Must be raw body — disable Next.js body parsing
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const parsed = CheckoutSessionPayloadSchema.safeParse(event.data.object)
      if (!parsed.success) {
        console.warn('[stripe/webhook] checkout.session.completed invalid payload', { issues: parsed.error.issues, eventId: event.id })
        break
      }
      const { metadata: { userId }, customer: customerId, subscription: subscriptionId } = parsed.data
      try {
        await billingService.handleCheckoutCompleted(userId, customerId, subscriptionId)
      } catch (err) {
        if (err instanceof UnknownStripePriceException) {
          console.warn('[stripe/webhook] checkout.session.completed unknown price', { eventId: event.id, message: err.message })
        } else throw err
      }
      break
    }

    case 'customer.subscription.updated': {
      const parsed = SubscriptionPayloadSchema.safeParse(event.data.object)
      if (!parsed.success) {
        console.warn('[stripe/webhook] customer.subscription.updated invalid payload', { issues: parsed.error.issues, eventId: event.id })
        break
      }
      try {
        await billingService.handleSubscriptionUpdated(parsed.data.customer, event.data.object as Stripe.Subscription)
      } catch (err) {
        if (err instanceof NoStripeCustomerFoundException) {
          console.warn('[stripe/webhook] customer.subscription.updated', { eventId: event.id, message: err.message })
        } else throw err
      }
      break
    }

    case 'customer.subscription.deleted': {
      const parsed = SubscriptionPayloadSchema.safeParse(event.data.object)
      if (!parsed.success) {
        console.warn('[stripe/webhook] customer.subscription.deleted invalid payload', { issues: parsed.error.issues, eventId: event.id })
        break
      }
      try {
        await billingService.handleSubscriptionDeleted(parsed.data.customer)
      } catch (err) {
        if (err instanceof NoStripeCustomerFoundException) {
          console.warn('[stripe/webhook] customer.subscription.deleted', { eventId: event.id, message: err.message })
        } else throw err
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
